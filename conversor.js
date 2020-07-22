var fs = require('fs')
const { error } = require('console')

module.exports = {
    check: function(schema){
        try{
            schema = JSON.parse(schema)

            return {text:'Valid JSON Schema',shacl:this.start(schema)}
        } catch {
            if(err == 'SyntaxError: Unexpected token o in JSON at position 1'){
                return {text:"Valid JSON Schema!",shacl:this.start(schema)}
            }
            return {text:"Invalid JSON Schema!",shacl:''}
        }
    },
    start: function(schema){
        var JS4GeoDataTypes = {'Point':'Point','LineString':'LineString','Polygon':'Polygon','MultiPoint':'MultiPoint','MultiLineString':'MultiLineString','GeometryCollection':'GeometryCollection'}
        var dataTypes = {"string":"string","integer":"decimal","boolean":"boolean","null":"null","number":"decimal",
        "Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean"}
        var constraints = {"maximun":"maxInclusive","exclusiveMaximum":"maxExclusive","minimum":"minInclusive","exclusiveMinimum":"minExclusive","minLength":"minLength","maxLength":"maxLength","pattern":"pattern","enum":"in","const":"in"}
        var anotherConstraints = {"allOf":"and","anyOf":"or","oneOf":"xone"}
        
        var scope = 1
        var nodesReady = {}
        var newNodes = {}
        var number = 0

        var shacl = ''
        var mappedDatatypes = []
        var defSectionElements
        var schemaSectionElements

        function setGenericArrayProperty(element,name,required){
            var local = ''
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n` + addSpaces(-1) + '];\n'
            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }
            local += addSpaces(-1) + '];\n'
            return local
        }

        function setListValidationArrayProperty(element,name,required){
            var local = ''
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n`
            if('$ref' in element.items){
                local += addSpaces() + `sh:datatype ${element.items.$ref.split('/')[2]}_Shape;\n` + addSpaces(-1) + '];\n'
            } else {
                if(element.items.type in dataTypes){
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element.items.type]};\n` + addSpaces(-1) + '];\n'
                } else {
                    name += 1
                    local += addSpaces() + `sh:datatype ex:${name}_Shape;\n` + addSpaces(-1) + '];\n'
                    newNodes[name] = element.items
                }
                
            }
            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }
            local += addSpaces(-1) + '];\n'

            return local
        }

        function setTupleArrayProperty(element,name){
            var local = ''
            var index = 0
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n`
            element.items.forEach(element_ => {
                if(element_.type in dataTypes){
                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        local += addSpaces(1) + `sh:path (ref:rest rdf:first);\n`
                    }
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element_.type]};\n` + addSpaces(-1) + '];\n'
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

        function setArray(element,name,required){
            var local
            if('type' in element && 'items' in element && element['items'].length != undefined){
                local = setTupleArrayProperty(element,name,required)
            } else if ('type' in element && 'items' in element){
                local = setListValidationArrayProperty(element,name,required)
            } else {
                local = setGenericArrayProperty(element,name,required)
            }
            return local
        }

        function setPrimitiveProperty(element,name,required){
            var local = ''
            local += addSpaces() + 'sh:property [\n'

            if(name != null){
                local += addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:datatype xsd:${dataTypes[element.type]};\n`
            } else {
                if(dataTypes[element] != undefined){
                    local += addSpaces(1) + `sh:datatype xsd:${dataTypes[element]};\n`
                } else {
                    local += addSpaces(1) + `sh:datatype ${element};\n`
                }
                
            }
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
            if(name != null){
                if(ref != null){
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ex:${ref}_Shape;\n`
        
                } else {
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ex:${name}_Shape;\n`
            
                }
                if(required){
                    local += addSpaces() + `sh:minCount 1;\n` + addSpaces(-1) + '];\n'
                } else {
                    local += addSpaces(-1) + '];\n'
                }
                
            } else {
                // Excecao para tratar nodes em allOf, anyOf e oneOf.
                number++
                newNodes[number] = element

                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:node ${number}_Shape;\n` + addSpaces(-1) + '];\n'
            }
            return local
        }

        function setShInProperty(element,name,item,required){
            var local = ''
            local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${item};\n` + addSpaces() + `sh:in (${element[name]})\n`
            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }
            local += addSpaces(-1) + `];\n`
            return local
        }

        //#region NAO TA FUNCIONANDO

        function setOthersProperty(element,name){
            var local = ''

            if(name == 'allOf'){
                local += addSpaces() + 'sh:and (\n'
            } else if(name == 'oneOf'){
                local += addSpaces() + 'sh:xone (\n'
            } else {
                local += addSpaces() + 'sh:or (\n'
            }

            var prop = element[name]

            prop.forEach(element_ => {
                for(var i in element_){
                    
                    if(i != 'description' && i != 'additionalProperties'){
                        console.log(i)
                        local += addSpaces(1) + '[\n'
                        scope++
                        if(i != '$ref'){
                        
                            if(element_[i].$ref){
                                local += setComplexNodeShape(element_[i].$ref,i)
                            }
                            else if(element_[i].type in dataTypes){
                                
                                local += setPrimitiveProperty(element_[i],i,checkRequired(element,i))
                                
                            } else if(element_[i].type == 'array'){

                                local += setArray(element_[i],i,checkRequired(element,i))

                            } else if(element_[i].type == 'object'){

                                local += setComplexNodeShape(element_[i],i,checkRequired(element,i))

                            } else if (i in anotherConstraints){

                                local += setOthersProperty(element_[i],i)
                                
                            } else if(i in constraints){
                                if(i == 'enum' || i == 'const'){
                                    local += setShInProperty(element_[i],i)
                                }
                            } else if(i == 'type'){
                                if(element_[i] == 'object'){
                                    local += setComplexNodeShape(element_,null)
                                } else if(element_[i] == 'array'){
                                    local += setArray(element_,name)
                                } else if(element_[i] in dataTypes){
                                    local += setPrimitiveProperty(element_[i],null)
                                }
                                
                            }
                            scope -= 2
                            local += addSpaces(1) + ']\n'
                        } else {
                            
                            local += addSpaces() + `ex:${element_[i].split('/')[2]}_shape\n`
                            scope -= 2
                            local += addSpaces(1) + ']\n'
                        }
                        scope--
                    }
                    
                }
            })
            local += addSpaces() + ');\n'

            return local
        }

        //#endregion

        

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

        function createSchemaSectionElementes(element){
            // schemaSectionElements = getPropertyElements(element)
            // if(schemaSectionElements != undefined){
            //     for(var item in schemaSectionElements){
            //         if(schemaSectionElements[item].type in dataTypes){
            //             shacl += setPrimitiveProperty(schemaSectionElements[item],item,checkRequired(element,item))
            //         } else{
            //             shacl += create_Complex_Property(schemaSectionElements[item],item)
            //         }
            //     }
            // }
            nodesReady['JS_id'] = setMainNodeShape() + create_New_Complex_NodeShape_Structure(element,'JS_id')
        }

        function setMainNodeShape(element){
            var local = 'ex:JS_id a sh:NodeShape;\n' + addSpaces() + 'sh:targetClass :JS_id;\n'
            return local
        }

        function create_New_Complex_NodeShape(element,name){
            var node = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass :${name};\n`

            nodesReady[name] = node + create_New_Complex_NodeShape_Structure(element,name)
        }

        function create_Complex_Property(element,name){
            var local = ''

        }

        function create_New_Complex_NodeShape_Structure(element,name){
            var local = ''
            var propertiesElements = getPropertyElements(element)

            // console.log(element)

            if(propertiesElements != undefined){
                for(var item in propertiesElements){
                    if(propertiesElements[item].type in dataTypes){
                        local += setPrimitiveProperty(propertiesElements[item],item,checkRequired(element,item))
                    } else if(propertiesElements[item].type == 'object'){
                        newNodes[item] = propertiesElements[item]
                        local += setComplexNodeShape(propertiesElements[item],item,checkRequired(element,item))
                    } else if(propertiesElements[item].type == 'array'){
                        local += setArray(propertiesElements[item],item,checkRequired(element,item))
                    } else if(propertiesElements[item].$ref){
                        local += setComplexNodeShape(null,item,checkRequired(element,item),propertiesElements[item].$ref.split('/')[2])
                    } else {
                        for(var i in propertiesElements[item]){
                            if(i in anotherConstraints){
                                // local += setOthersProperty(propertiesElements[item],i)
                            } else if (i in constraints){
                                local += setShInProperty(propertiesElements[item],i,item,checkRequired(element,item))
                            }
                        }
                    }
                }
            } else {
                if(element.type == 'array'){
                    local += setArray(element,name,checkRequired(element,name))
                } else if(element.type in dataTypes){
                    local += setPrimitiveProperty(element,name,checkRequired(element,name))
                } else if(element.type == 'object'){
                    
                } else {
                    for(var i in element){
                        if(i in anotherConstraints){
                            // local += setOthersProperty(element,i)
                        } else if(i in constraints){
                            local += setShInProperty(element[i],i,required=checkRequired(element,i))
                        }
                    }
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
            setMainNodeShape(schema)
            createDefSectionElements(schema)
            createSchemaSectionElementes(schema)
        }
        
        setup(schema)
        
        //#endregion

        

        while(Object.keys(nodesReady).length > 0 || Object.keys(newNodes).length > 0){
            for(var i in newNodes){
                if(i == 4){
                    console.log(newNodes[i])
                }
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
