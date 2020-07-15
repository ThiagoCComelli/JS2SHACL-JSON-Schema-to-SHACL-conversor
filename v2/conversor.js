var fs = require('fs')
const { error } = require('console')

module.exports = {
    start: function(schema){
        var JS4GeoDataTypes = {'Point':'Point','LineString':'LineString','Polygon':'Polygon','MultiPoint':'MultiPoint','MultiLineString':'MultiLineString','GeometryCollection':'GeometryCollection'}
        var dataTypes = {"string":"string","integer":"decimal","boolean":"boolean","null":"null",
        "Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean"}
        var constraints = {"maximun":"maxInclusive","exclusiveMaximum":"maxExclusive","minimum":"minInclusive","exclusiveMinimum":"minExclusive","minLength":"minLength","maxLength":"maxLength","pattern":"pattern","enum":"in","const":"in"}
        var anotherConstraints = {"allOf":"and","anyOf":"or","oneOf":"xone"}
        
        var datatypeMapped = []
        var newNodes = {}
        var defSectionElements = {}
        var schemaSectionElements = []
        var shacl
        var scope = 1
        var op = false
        
        //#region STARTUP SECTION
        
        function setMainNodeShape(schema) {
            shacl = 'ex:JS_id a sh:NodeShape;\n' + addSpaces() + 'sh:targetClass: JS_id;\n'
        }
        
        function getDefSectionElements(schema){
            if(schema.definitions){
                return schema.definitions
            }
        }
        
        function getPropertyElements(schema){
            if(schema.properties){
                return schema.properties
            }
        }
        
        //#endregion
        
        function createElementsDefSection(schema){
            defSectionElements = getDefSectionElements(schema)
        
            for(var i in defSectionElements){
                element = defSectionElements[i]
                if(!(element.type in dataTypes)){
                    if(element.type in JS4GeoDataTypes){
                        create_New_JS4Geon_NodeShape(element)
                    } else {
                        create_New_Complex_NodeShape(element,i)
                    }
                }
                datatypeMapped.push(i)
            }
        }
        
        function createPropertiesSection(schema){
            schemaSectionElements = getPropertyElements(schema)

            for(var item in schemaSectionElements){
                element = schemaSectionElements[item]
                if(element.type in dataTypes){
                    setPrimitiveProperty(element,item,checkRequired(schema,item))
                } else {
                    create_Complex_Property_root(element,item,checkRequired(schema,item))
                }
            }
            setMainNodeShape()
            for(var item in schemaSectionElements){
                element = schemaSectionElements[item]
                if(element.type in dataTypes){
                    setPrimitiveProperty(element,item,checkRequired(schema,item))
                } else if(element.type == 'object'){
                    setComplexNodeShape(element,item)
                } else if(element.type == 'array'){
                    setArray(element,item)
                }
            }
            shacl += '========'
        }
        
        function create_New_JS4Geon_NodeShape(schema){
        
        }
        
        function create_New_Complex_NodeShape(schema,name){
            shacl = ''
            
            node = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name};\n`
            
            console.log(schema)
            console.log(name)
            newNodes[name] = node + create_Complex_Property(schema,name)
        }
        
        
        function setPrimitiveProperty(element,name,required){
            shacl += addSpaces() + 'sh:property [\n' + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:datatype ${dataTypes[element.type]};\n`
            for(var item in element){
                if(item in constraints){
                    shacl += addSpaces() + `sh:${constraints[item]} ${element[item]};\n`
                }
            }
            if(required){
                shacl += addSpaces() + `sh:minCount 1;\n`
            }
            shacl += addSpaces(-1) + '];\n'
        }
        
        function setComplexNodeShape(element,name,required,ref = null){
            if(ref != null){
                shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ${ref}_Shape;\n`
        
            } else {
                shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ${name};\n` + addSpaces() + `sh:node ${name}_Shape;\n`
        
            }
            if(required){
                shacl += addSpaces() + `sh:minCount 1;\n` + addSpaces(-1) + '];\n'
            } else {
                shacl += addSpaces(-1) + '];\n'
            }
        }

        function setGenericArrayProperty(element,name){
            shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n'
        }

        function setListValidationArrayProperty(element,name){
            shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath redf:rest] ref:first);\n`
            if('$ref' in element.items){
                shacl += addSpaces() + `sh:datatype ${element.items.$ref.split('/')[2]}_Shape;\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n' 
            } else {
                shacl += addSpaces() + `sh:datatype ${element.items.type};\n` + addSpaces(-1) + '];\n' + addSpaces(-1) + '];\n'
            }
        }

        function setTupleArrayProperty(element,name){
            var newShapes = []
            shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n`
            element.items.forEach(element_ => {
                if(element_.type in dataTypes){
                    shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path rdf:first;\n` + addSpaces() + `sh:datatype ${dataTypes[element_.type]};\n` + addSpaces(-1) + '];\n'
                } else {
                    shacl += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path rdf:first;\n` + addSpaces() + `sh:node ex:${name}_Shape;\n` + addSpaces(-1) + '];\n'
                    newShapes.push({name:name,schema:element_})
                }
                if(element_ == element.items[element.items.length-1]){
                    shacl += addSpaces(-1) + '];\n'
                }
            })

            return newShapes
            newShapes.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })
        }

        function setArray(element,name){
            var newShapesArray = []
            if('type' in element && 'items' in element && element['items'].length != undefined){
                newShapesArray = setTupleArrayProperty(element,name)
            } else if ('type' in element && 'items' in element){
                setListValidationArrayProperty(element,name)
            } else {
                setGenericArrayProperty(element,name)
            }
            return newShapesArray
        }
        
        function create_New_NodeShape(element,name){
            scope = 1
            shacl = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name};\n`
            newNodes[name] = create_Complex_Property(element,name)
        }

        function create_Complex_Property_root(element,name){
            var newShapes = []
            var newShapesArray = []

            if(element.type == 'object'){
                setComplexNodeShape(element,name,checkRequired(element,name))
                create_New_Complex_NodeShape(element,name)
                // newShapes.push({schema:element,name:name})
            } else if (element.type == 'array'){
                newShapesArray =  setArray(element,name)
            }

            newShapes.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })
            newShapesArray.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })
        }

        function create_Complex_Property(element,name){
            var propertyElements = getPropertyElements(element)
            
            var newShapes = []
            var newShapesArray = []

            if(propertyElements != undefined){
                for(var i in propertyElements){
                    console.log(i)
                    // funcao criada para tratar esta excessao nao definida no algoritmo
                    if(propertyElements[i].$ref){
                        shape = propertyElements[i].$ref.split('/')[2]
                        
                        setComplexNodeShape(propertyElements[i],i,checkRequired(element,i),shape)
                    }
                    else if(propertyElements[i].type in dataTypes){
                        setPrimitiveProperty(propertyElements[i],i,checkRequired(element,i))
                    } 
                    else if(propertyElements[i].type == 'object'){
                        if(!(i in newNodes)){
                            
                            newShapes.push({name:i,schema:propertyElements[i]})
                        }
                        setComplexNodeShape(propertyElements[i],i,checkRequired(element,i))
                    } 
                    else if (propertyElements[i].type == 'array'){
                        newShapesArray = setArray(propertyElements[i],i)
                    }
                }
            } else {
                // parte modificada para permitir a checagem das listas sem dar erro ao checar as propriedades
                if(element.type == 'array'){
                    newShapesArray = setArray(element,name)
                } else if('$ref' in element){
                    shape = element.$ref.split('/')[2]
                    setComplexNodeShape(element,name,checkRequired(element,name),shape)
                }
                
            }
            newShapes.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })
            newShapesArray.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })

            return shacl
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
            // setMainNodeShape(schema)
            getDefSectionElements(schema)
            // getPropertyElements(schema)
            createElementsDefSection(schema)
            setMainNodeShape(schema)
            createPropertiesSection(schema)
        }
        
        setup(schema)

        // shacl = ''
        
        for(var i in newNodes){
            shacl += `\n${newNodes[i]}`
        }
        
        //#endregion

        return shacl
    }
}
