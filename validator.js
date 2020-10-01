const fs = require('fs')
const factory = require('rdf-ext')
const ParserN3 = require('@rdfjs/parser-n3')
const SHACLValidator = require('rdf-validate-shacl')

function loadDataset (filePath) {
    const stream = fs.createReadStream(filePath)
    const parser = new ParserN3({ factory })
    return factory.dataset().import(parser.import(stream))
}

async function setup(){
    try{
        const shapes = await loadDataset('503-JS4Geo-MultiLineString-ShapesGraph.ttl')
        const data = await loadDataset('504-JS4Geo-MultiLineString-DataGraph.ttl')
        
        const validator = new SHACLValidator(shapes, { factory })
        const report = await validator.validate(data)
        
        console.log(report.conforms)
        
    } catch (err) {
        console.log(err)
    }
    

}

setup()


