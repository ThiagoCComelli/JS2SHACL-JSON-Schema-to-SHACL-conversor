const fs = require('fs')
const {performance} = require('perf_hooks')
const conversor = require('./conversor')
const server = require('./server')

var args = process.argv
var totalFilesAnalized = 0
var totalFilesInRepository = 0
var totalTime = 0
var totalTimeOnlyConversion = 0
var finalTimeConversion = 0
var totalFiles = 0
// Change that value for most precise conversion time
// Do the conversion 'STOP' times and return the average time conversion
var STOP = 1
var session = 0
var option
var t0
var t1
var t00
var t11

function writeFile(_name,cont){
  var log = ''

  try {
    t11 = performance.now()

    totalTimeOnlyConversion += t11-t00

    if(session > 0){
      finalTimeConversion += t11-t00
    }
  } catch {

  }
  var name = _name.split('.')

  fs.writeFile(__dirname + `/outputSchemas/${name[0]}.ttl`,cont.shacl,(err,contents)=>{
    
  })

  // JSON.stringify(cont.count)

  log += `Created Nodes (Shapefile): ${cont.count['node']}\nCreated Propertys (Shapefile): ${cont.count['property']}\nElements analyzed (JSON Schema): ${cont.count['elements']}\nProperties analyzed (JSON Schema): ${cont.count['properties']}\n\n==============================\n\n${cont.elements.length} Warnings (Elements ignored!)\n\n`

  for(var i in cont.elements){
    log += 'Key: ' + cont.elements[i].element
    if(cont.elements[i].primitive){
      log += ' => ATTENTION THIS IS A PRIMITIVE ELEMENT, IT MAY NOT BE ACCURATE!!!'
    }
    log += `\nElement: ${cont.elements[i].schema}\n\n`
    
  }

  fs.writeFile(__dirname + `/outputLog/${name[0]}_log.txt`,log,(err,contents)=>{
    
  })

  if(totalFilesAnalized == totalFilesInRepository){
    t1 = performance.now()
    console.timeEnd('exec')
    session++
    stats()
  }
}

// FINAL STEP - SHOW THE LOG

function stats(){
  
  totalTime = t1-t0

  console.log(`Session: ${session}/${STOP+1}\nAll files converted: ${totalFilesAnalized}\nExecution total time (read and write file): ${totalTime} ms\nExecution total time only conversion: ${totalTimeOnlyConversion} ms\n`)

  totalFilesAnalized = 0
  totalFilesInRepository = 0
  totalTimeOnlyConversion = 0

  totalFiles++

  if (totalFiles < STOP + 1){
    
    if(option){
      readRepository()
    }else{
      readSingleFile(args[2])
    }
    
  } else {
    console.log(`Average time conversion: ${finalTimeConversion/(session-1)} ms\nTotal sessions analized: ${session-1}\n`)
  }
}

// READ ALL FILES IN DIRECTORY TO MAKE A CONVERSION

function readRepository(){
  t0 = performance.now()
  console.time('exec')
  
  // session++

  fs.readdir(__dirname + "/inputSchemas",(err,filenames)=>{
    if(err){
      return
    }

    lastFile = filenames[filenames.length-1]
    totalFilesInRepository = filenames.length-1

    filenames.forEach((filename)=>{
      if(filename == 'someTests'){
        return
      }

      fs.readFile(__dirname + "/inputSchemas/" + filename,'utf8',(err,contents)=>{
        try{
          var cont = JSON.parse(contents)
        } catch {
          totalFilesInRepository--
          return
        }
        
        totalFilesAnalized++

        t00 = performance.now()

        // START CONVERSION - WRITE FILE
        var result = conversor.start(cont)
        writeFile(filename,result)
      })
    })
  })
}

function readSingleFile(name){
  t0 = performance.now()
  fs.readFile(__dirname + "/inputSchemas/" + args[2],'utf8',(err,contents)=>{
    try{
      var cont = JSON.parse(contents)
    } catch {
    }
    
    totalFilesAnalized++
    totalFilesInRepository++

    t00 = performance.now()
    console.time('exec')

    // START CONVERSION - WRITE FILE
    var result = conversor.start(cont)
    writeFile(name,result)
  })
}

// START THE WHOLE PROCESS

function setup(){
  try{
    args.forEach(element => {
      if(element == '-a'){
        option = true
      }
    })
  }catch{

  }
  
  if(option){
    readRepository()
  } else {
    if(args[2] === undefined){
      server.startServer()
    } else {
      readSingleFile(args[2])
    }
  }
}

setup()
