const fs = require('fs')
const inquirer = require('inquirer')
const {performance} = require('perf_hooks')
const { Console } = require('console')
const conversor = require('./conversor')

var totalFilesAnalized = 0
var totalFilesInRepository = 0
var totalTime = 0
var totalTimeOnlyConversion = 0
var finalTime = 0
var finalTimeConversion = 0
var totalFiles = 0
var file
var STOP = 1
var session = 0
var option
var t0
var t1
var t00
var t11
var dirInputName = __dirname+"/inputSchemas"
var dirOutputName = __dirname+"/outputSchemas"
var initialQuestion = [{
  type:'input',
  name:'option',
  message:'Convert single file or a repository (0 => file || 1 => repository)'
}]
var dirLocation = [{
  type:'input',
  name:'location',
  message:'Directory location (ex: /home/thiago/Documents/JSON-Schema-SHACL/random/v3/inputSchemas)'
}]
var fileName = [{
  type:'input',
  name:'name',
  message:'File name (ex: schema00.json)'
}]

function writeFile(_name,cont){
  var log = ''

  try {
    t11 = performance.now()

    totalTimeOnlyConversion += t11-t00

    if(session > 0){
      finalTimeConversion += totalTimeOnlyConversion
    }
  } catch {

  }

  var name = _name.split('.')

  fs.writeFile(`${dirOutputName}/${name[0]}.ttl`,cont.shacl,(err,contents)=>{
    
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

  fs.writeFile(`/home/thiago/Documents/SHACL-Conversor/outputLog/${name[0]}_log.txt`,log,(err,contents)=>{
    
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
      readSingleFile(file)
    }else{
      readRepository()
    }
    
  } else {
    console.log(`Average time conversion: ${finalTimeConversion/(session-1)} ms\nTotal sessions analized: ${session-1}\n`)
  }

  // readFiles()
}

// READ ALL FILES IN DIRECTORY TO MAKE A CONVERSION

function readRepository(){
  t0 = performance.now()
  console.time('exec')
  
  // session++

  fs.readdir("/home/thiago/Documents/SHACL-Conversor/inputSchemas",(err,filenames)=>{
    if(err){
      return
    }

    lastFile = filenames[filenames.length-1]
    totalFilesInRepository = filenames.length

    filenames.forEach((filename)=>{
      fs.readFile("/home/thiago/Documents/SHACL-Conversor/inputSchemas" + '/' + filename,'utf8',(err,contents)=>{
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
  // console.log(dirInputName['location'])
  fs.readFile("/home/thiago/Documents/SHACL-Conversor/inputSchemas" + '/' + name,'utf8',(err,contents)=>{
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

inquirer.prompt(initialQuestion).then(answers => {
  if(answers['option'] == "1"){
    inquirer.prompt(dirLocation).then(location => {
      dirInputName = location
      option = false
      readRepository()
    })
    
  }else if (answers['option'] == "0"){
    inquirer.prompt(dirLocation).then(location => {
      inquirer.prompt(fileName).then(name => {
        dirInputName = location
        file = name['name']
        option = true
        readSingleFile(name['name'])
      })
    })
  }
})