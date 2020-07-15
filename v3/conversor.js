var fs = require('fs')
const { error } = require('console')

module.exports = {
    start: function(schema){
        var JS4GeoDataTypes = {'Point':'Point','LineString':'LineString','Polygon':'Polygon','MultiPoint':'MultiPoint','MultiLineString':'MultiLineString','GeometryCollection':'GeometryCollection'}
        var dataTypes = {"string":"string","integer":"decimal","boolean":"boolean","null":"null",
        "Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean"}
        var constraints = {"maximun":"maxInclusive","exclusiveMaximum":"maxExclusive","minimum":"minInclusive","exclusiveMinimum":"minExclusive","minLength":"minLength","maxLength":"maxLength","pattern":"pattern","enum":"in","const":"in"}
        var anotherConstraints = {"allOf":"and","anyOf":"or","oneOf":"xone"}
        
        var scope = 1
        var nodesReady = {}
        var newNodes = {}

        var shacl = ''
        var mappedDatatypes = []
        var defSectionElements
        var schemaSectionElements

        function setGenericArrayProperty(element,name){
            var local = ''
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n'
            return local
        }

        function setListValidationArrayProperty(element,name){
            var local = ''
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n`
            if('$ref' in element.items){
                local += addSpaces() + `sh:datatype ${element.items.$ref.split('/')[2]}_Shape;\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n' 
            } else {
                if(element.items.type in dataTypes){
                    local += addSpaces() + `sh:datatype ${element.items.type};\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n'
                } else {
                    name += 1
                    local += addSpaces() + `sh:datatype ${name}_Shape;\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n'
                    newNodes[name] = element.items
                }
                
            }
            return local
        }

        function setTupleArrayProperty(element,name){
            var local = ''
            var index = 0
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n`
            element.items.forEach(element_ => {
                if(element_.type in dataTypes){
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path rdf:first;\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        local += addSpaces(1) + `sh:path (ref:rest rdf:first);\n`
                    }
                    local += addSpaces() + `sh:datatype ${dataTypes[element_.type]};\n` + addSpaces(-1) + '];\n'
                } else {
                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        local += addSpaces(1) + `sh:path (ref:rest rdf:first);\n`
                    }
                    local += addSpaces() + `sh:node ex:${name}_Shape;\n` + addSpaces(-1) + '];\n'
                    newNodes[name] = element_
                }
                if(element_ == element.items[element.items.length-1]){
                    local += addSpaces(-1) + '];\n'
                }
                index++
            })
            return local
        }

        function setArray(element,name){
            var local
            if('type' in element && 'items' in element && element['items'].length != undefined){
                local = setTupleArrayProperty(element,name)
            } else if ('type' in element && 'items' in element){
                local = setListValidationArrayProperty(element,name)
            } else {
                local = setGenericArrayProperty(element,name)
            }
            return local
        }

        function setPrimitiveProperty(element,name,required){
            var local = ''
            local += addSpaces() + 'sh:property [\n' + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:datatype ${dataTypes[element.type]};\n`
            for(var item in element){
                if(item in constraints){
                    if(item == 'const' || item == 'enum'){
                        local += addSpaces() + `sh:${constraints[item]} (${element[item]});\n`
                    } else {
                        local += addSpaces() + `sh:${constraints[item]} ${element[item]};\n`
                    }
                    
                }
            }
            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }
            local += addSpaces(-1) + '];\n'
            return local
        }
        
        function setComplexNodeShape(element,name,required,ref = null){
            var local = ''
            if(ref != null){
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ${ref}_Shape;\n`
        
            } else {
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ${name}_Shape;\n`
        
            }
            if(required){
                local += addSpaces() + `sh:minCount 1;\n` + addSpaces(-1) + '];\n'
            } else {
                local += addSpaces(-1) + '];\n'
            }
            return local
        }

        function setMainNodeShape(element){
            shacl = 'ex:JS_id a sh:NodeShape;\n' + addSpaces() + 'sh:targetClass :JS_id;\n'
        }

        function getDefSectionElements(element){
            if(element.definitions){
                return element.definitions
            }
        }
        
        function getPropertyElements(element){
            if(element.properties){
                return element.properties
            }
        }

        function createDefSectionElements(element){
            defSectionElements = getDefSectionElements(element)
            if(defSectionElements != undefined){
                for(var item in defSectionElements){
                    if(!(item.type in dataTypes)){
                        if(item.type in JS4GeoDataTypes){

                        } else {
                            create_New_Complex_NodeShape(defSectionElements[item],item)
                        }
                    }
                }
                mappedDatatypes.push(item)
            }
        }
        
        function create_New_Complex_NodeShape(element,name){
            var node = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass :${name};\n`

            nodesReady[name] = node + create_New_Complex_NodeShape_Structure(element,name)
        }

        function create_New_Complex_NodeShape_Structure(element,name){
            var local = ''
            var propertiesElements = getPropertyElements(element)

            if(propertiesElements != undefined){
                for(var item in propertiesElements){
                    if(propertiesElements[item].type in dataTypes){
                        local += setPrimitiveProperty(propertiesElements[item],item,checkRequired(element,item))
                    } else if(propertiesElements[item].type == 'object'){
                        newNodes[item] = propertiesElements[item]
                        local += setComplexNodeShape(propertiesElements[item],item,checkRequired(element,item))
                    } else if(propertiesElements[item].type == 'array'){
                        local += setArray(propertiesElements[item],item)
                    } else if(propertiesElements[item].$ref){
                        local += setComplexNodeShape(null,item,checkRequired(element,item),propertiesElements[item].$ref.split('/')[2])
                    }
                }
            } else {
                if(element.type == 'array'){
                    local += setArray(element,name)
                } else if(element.type in dataTypes){
                    local += setPrimitiveProperty(element,name,checkRequired(element,name))
                }
            }

            return local
        }
        
        //#region FUNCTIONS TO HELP
        
        function addSpaces(quant = 0){
            scope += quant
            return Array(scope*2).fill('\xa0').join('')
        }
        
        function checkRequired(schema,item){
            var op = false
            if(schema.required){
                schema.required.forEach(itemRequired => {
                    if(item == itemRequired){
                        op = true
                    }
                });
            } else {
                
            }
            return op
        }
        
        //#endregion
        
        //#region SETUP SECTION
        
        function setup(schema) {
            setMainNodeShape()
            createDefSectionElements(schema)
        }
        
        setup(schema)
        
        //#endregion

        

        while(Object.keys(nodesReady).length > 0 || Object.keys(newNodes).length > 0){
            for(var i in newNodes){
                create_New_Complex_NodeShape(newNodes[i],i)
                delete newNodes[i]
            }
            for(var i in nodesReady){
                shacl += '\n' + nodesReady[i]
                delete nodesReady[i]
            }
        }
        

        return shacl
    }
}
