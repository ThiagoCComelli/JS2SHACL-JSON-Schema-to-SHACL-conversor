var fs = require('fs')

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
                    create_Complex_Property(element,item)
                }
            }
        }
        
        function create_New_JS4Geon_NodeShape(schema){
        
        }
        
        function create_New_Complex_NodeShape(schema,name){
            shacl = ''
            node = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name};\n`
        
            newNodes[name] = node + create_Complex_Property(element,name)
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
                shacl += addSpaces() + `sh:minCount 1;\n`
            } else {
                shacl += addSpaces(-1) + '];\n'
            }
        }
        
        function create_New_NodeShape(element,name){
            shacl += `\nex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name};\n`
            create_Complex_Property(element,name)
        }
        
        function create_Complex_Property(element,name,op){
            var propertyElements = getPropertyElements(element)
            var newShapes = []
            for(var i in propertyElements){
        
                // funcao criada para tratar esta excessao nao definida no algoritmo
                if(propertyElements[i].$ref){
                    shape = propertyElements[i].$ref.split('/')[2]
        
                    setComplexNodeShape(propertyElements[i],i,checkRequired(element,i),shape)
                }
                else if(propertyElements[i].type in dataTypes){
                    setPrimitiveProperty(propertyElements[i],i,checkRequired(element,i))
                } else if(propertyElements[i].type == 'object'){
                    if(!(i in newNodes)){
                        newShapes.push({name:i,schema:propertyElements[i]})
                    }
                    setComplexNodeShape(propertyElements[i],i,checkRequired(element,i))
                }
            }
            newShapes.forEach(element_ => {
                create_New_NodeShape(element_.schema,element_.name)
            })
        
            if(!op){
                return shacl
            }
        }
        
        
        //#region FUNCTIONS TO HELP
        
        function addSpaces(quant = 0){
            scope += quant
            return Array(scope*2).fill('\xa0').join('')
        }
        
        function checkRequired(schema,item){
            var op
            if(schema.required){
                schema.required.forEach(itemRequired => {
                    if(item == itemRequired){
                        op = true
                    } else {
                        op = false
                    }
                });
            } else {
                op = false
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
            op = 1
            setMainNodeShape(schema)
            createPropertiesSection(schema)
        }
        
        setup(schema)

        for(var i in newNodes){
            shacl += `\n${newNodes[i]}`
        }
        
        //#endregion

        return shacl
    }
}
