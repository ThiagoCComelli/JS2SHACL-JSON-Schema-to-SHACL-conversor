const {performance} = require('perf_hooks')
const JS4Geo = require('./JS4GeoDefs.js')

module.exports = {
    check: function(schema,runs){
        try{
            schema = JSON.parse(schema)

            var time = 0

            for(var i = 0;i<runs+1;i++){
                result = this.start(schema)
                if(i!=0){
                    time += result.time
                    if(i==runs){
                        return {text:'Valid JSON Schema',shacl:result,time:time/runs,runs:runs}
                    }
                } 
            }
            
        } catch {
            console.log(err)
            return {text:"Invalid JSON Schema!",shacl:''}
        }
    },
    start: function(schema){
        var JS4GeoDataTypes = {'point':'pointShape','directPosition':'directPositionShape','Bbox':'bboxShape','lineString':'lineStringShape','polygon':'polygonShape','multiPoint':'multiPointShape','multiLineString':'multiLineStringShape','multiPolygon':'multiPolygonShape','feature':'featureShape','featureCollection':'featureCollectionShape','geometryCollection':'geometryCollectionShape'}
        var dataTypes = {"string":"string","integer":"integer","boolean":"boolean","null":"null","number":"decimal",
        "Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean"}
        var extendedDataTypes = {"Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean"}
        var constraints = {"maximun":"maxInclusive","exclusiveMaximum":"maxExclusive","minimum":"minInclusive","exclusiveMinimum":"minExclusive","minLength":"minLength","maxLength":"maxLength","pattern":"pattern","enum":"in","const":"in",
        "default_":"defaultValue","title":"name","description":"description"}
        var anotherConstraints = {"allOf":"and","anyOf":"or","oneOf":"xone"}
        var jsonReservedWords = {"properties":true,"definitions":true,"items":true,"required":true,"$ref":true,"type":true}
        var prefix = {"dash":"@prefix dash: <http://datashapes.org/dash#> .","rdf":"@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .","rdfs":"@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .","ex":"@prefix ex: <http://example.org/#> .","sh":"@prefix sh: <http://www.w3.org/ns/shacl#> .","xsd":"@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .","sf":"@prefix sf: <http://www.opengis.net/ont/sf#> .",'owl':'@prefix owl: <http://www.w3.org/2002/07/owl#> .'}

        var scope = 1
        var addPrefixes = {}
        var addGeo = {'imports':false,'feature':false}
        var nodesReady = {}
        var newNodes = {}
        var elementsCount = {"node":0,"property":0,"elements":0,"properties":0}
        var number = 0
        var elementsUndefined = []
        var log = ''
        var t0
        var t1

        var shacl = ''
        var mappedDatatypes = []
        var defSectionElements
        var schemaSectionElements

        function getDefSectionElements(element){
            if(element.definitions){
                return element.definitions
            }
        }
        
        function getPropertyElements(element){
            if(element != null){
                if(element.properties){
                    return element.properties
                }
            } else {
                return undefined
            }
            
        }

        function createDefSectionElements(element){
            defSectionElements = getDefSectionElements(element)
            if(defSectionElements != undefined){
                for(var item in defSectionElements){
                    // if(!(item.type in dataTypes)){
                    //     if(item.type in JS4GeoDataTypes){

                    //     } else {
                    //         create_New_Complex_NodeShape(defSectionElements[item],item)
                    //     }
                    // }
                    if(item in JS4GeoDataTypes){
                        create_New_JS4Geo_NodeShape(element,item)
                    } else if (item in extendedDataTypes){
                        elementsCount['elements'] += 1

                        elementsCount['property'] += 1
                    } else {
                        elementsCount['elements']++
                        create_New_Complex_NodeShape(defSectionElements[item],item)
                    }
                    mappedDatatypes.push(item)
                }
                
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
            addPrefixes['ex'] = true
            addPrefixes['sh'] = true
            elementsCount['node']++

            var local = 'ex:JS_id_Shape a sh:NodeShape;\n' + addSpaces() + 'sh:targetClass ex:JS_id'
            return local
        }

        function setGenericArrayProperty(element,name,required,last){
            var local = ''


            elementsCount['elements'] += 1
            elementsCount['property'] += 1
            elementsCount['properties'] += 1

            if(name != null){
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n` + addSpaces(-1) + '];\n'
            }else{
                local += addSpaces(1) + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n` + addSpaces(-1) + '];\n'
            }


            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }

            if(name!=null){
                local += addSpaces(-1) + ']'
                if(last!=null){
                   if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    } 
                }else{
                    local += '\n'
                }
                
            }
            
            return local
        }

        function setListValidationArrayProperty(element,name,required,last,specialCase=false){
            var local = ''


            elementsCount['elements'] += 1
            elementsCount['property'] += 2
            elementsCount['properties'] += 2
            
            if(specialCase){
                local += addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n`
            } else {
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n`
            }
            
            if('$ref' in element.items){
                try{
                    typeItem = element.items.$ref.split('/')
                    if(typeItem.length == 1){
                        typeItem = element.items.$ref.split('#')[1]
                    }else{
                        typeItem = element.items.$ref.split('/')[2]
                    }
                }catch{

                }

                if(typeItem in JS4GeoDataTypes){
                    addGeo['imports'] = true
                    addPrefixes['owl'] = true
                    addPrefixes['rdf'] = true
                    if(typeItem == 'feature' || typeItem == 'featureCollection'){
                        addGeo['feature'] = true
                    }
                    local += addSpaces() + `sh:datatype ex:${typeItem}Shape;\n` + addSpaces(-1) + '];\n'
                } else {
                    local += addSpaces() + `sh:datatype ex:${typeItem}_Shape;\n` + addSpaces(-1) + '];\n'
                }

                // if(last){
                //     local += '.\n'
                // }else{
                //     local += ';\n'
                // }
            } else {
                if(element.items.type in dataTypes){
                    addPrefixes['xsd'] = true
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element.items.type]};\n`

                    
                    if(last != null){
                        if(specialCase){
                            local += addSpaces(-1) + '].\n'
                        } else {
                            local += addSpaces(-1) + '];\n'
                        }
                    } else {
                        local += addSpaces(-1) + '];\n'
                    }
                    

                } else {
                    number++
                    
                    local += addSpaces() + `sh:datatype ex:obj${number}_Shape;\n` 
                    
                    if(specialCase){
                        local += addSpaces(-1) + '].\n'
                    } else {
                        local += addSpaces(-1) + '];\n'
                    }

                    newNodes['obj'+number] = element.items
                }
                
            }
            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }

            if(!specialCase){
                local += addSpaces(-1) + ']'
            }

            if(!specialCase){
                if(last != null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
                
            }
            

            return local
        }

        function setTupleArrayProperty(element,name,required,last){
            var local = ''
            var index = 0


            elementsCount['elements'] += 1
            elementsCount['property'] += 1
            elementsCount['properties'] += 2

            if(name != null){
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n`
            } else {
                local += addSpaces(1) + `sh:node dash:ListShape;\n`
            }


            element.items.forEach(element_ => {

                checkUndefined(element_)

                if(element_.type in dataTypes){
                    addPrefixes['xsd'] = true

                    elementsCount['elements'] += 1
                    elementsCount['property'] += 1
                    elementsCount['properties'] += 1
                    
                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        var str = '('

                        for(var i = 0 ; i < index ; i++){
                            str += 'rdf:rest '
                        }

                        str += 'rdf:first)'

                        local += addSpaces(1) + `sh:path ${str};\n`
                    }
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element_.type]};\n` + addSpaces(-1) + '];\n'
                } else {

                    elementsCount['elements'] += 1

                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        var str = '('

                        for(var i = 0 ; i < index ; i++){
                            str += 'rdf:rest '
                        }

                        str += 'rdf:first)'

                        local += addSpaces(1) + `sh:path ${str};\n`
                    }

                    number++
                    newNodes['obj'+number] = element_

                    local += addSpaces() + `sh:node ex:obj${number}_Shape;\n` + addSpaces(-1) + '];\n'

                }
                if(element_ == element.items[element.items.length-1]){

                    if(name != null){
                        local += addSpaces(-1) + ']'
                        if(last!=null){
                            if(last){
                                local += '.\n'
                            } else {
                                local += ';\n'
                            }
                        }else{
                            local += '\n'
                        }
                        
                    }
                    
                }
                index++
            })

            return local
        }

        function setArray(element,name,required,last,specialCase=false){
            var local

            addPrefixes['dash'] = true
            addPrefixes['rdf'] = true

            checkUndefined(element)

            if('type' in element && 'items' in element && element['items'].length != undefined){
                local = setTupleArrayProperty(element,name,required,last)
            } else if ('type' in element && 'items' in element){
                local = setListValidationArrayProperty(element,name,required,last,specialCase)
            } else {
                local = setGenericArrayProperty(element,name,required,last)
            }
            return local
        }

        function setPrimitiveProperty(element,name,required,last){
            var local = ''

            addPrefixes['xsd'] = true


            elementsCount['elements'] += 1
            elementsCount['property'] += 1
            elementsCount['properties'] += 1

            // if(name != null){
                local += addSpaces() + 'sh:property [\n'
            // }            

            checkUndefined(element,true)

            if(name != null){
                local += addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:datatype xsd:${dataTypes[element.type]};\n`
            } else {
                // if(dataTypes[element] != undefined){
                //     local += addSpaces(1) + `sh:datatype xsd:${dataTypes[element]};\n`
                // } else {
                //     local += addSpaces(1) + `sh:datatype ex:${element};\n`
                // }

                // SOLUCAO TEMPORARIA PARA O ERRO CASESTUDY ARRAY PEGANDO VALOR NEGATIVO
                local += addSpaces(2) + `sh:datatype xsd:${dataTypes[element.type]};\n`
                
            }
            for(var item in element){
                if(item in constraints){
                    if(item == 'const' || item == 'enum'){
                        try{
                            var str = ''
                            element.forEach(Element_ => {
                                str += `"${Element_}" `
                            })
            
                            local += addSpaces() + `sh:${constraints[item]} (${str});\n`
                        } catch{
                            local += addSpaces() + `sh:${constraints[item]} ("${element[item]}");\n`
                        }

                    } else if(item == 'pattern' || item == "description" || item == "title" || (item == "default" && element.type == "string")){
                        local += addSpaces() + `sh:${constraints[item]} "${element[item]}";\n`
                    } else {
                        local += addSpaces() + `sh:${constraints[item]} ${element[item]};\n`
                    }
                    
                }
            }
            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }

            // if(name != null){
                local += addSpaces(-1) + ']'
                if(last!=null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
            // }

            return local
        }
        
        function setComplexNodeShape(element,name,required,ref = null,last){
            var local = ''

            elementsCount['elements'] += 1

            checkUndefined(element)
            if(name != null){

                elementsCount['properties'] += 1

                if(ref != null){
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node ex:${ref}_Shape;\n`
                } else {
                    newNodes[name] = element

                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node ex:${name}_Shape;\n`
                }

                
                if(required){
                    local += addSpaces() + `sh:minCount 1;\n`
                }

                local += addSpaces(-1) + ']'

                if(last!=null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
                
                
            } else {
                // Excecao para tratar nodes em allOf, anyOf e oneOf.
                number++
                newNodes['obj'+number] = element

                local += addSpaces(1) + `sh:node ex:obj${number}_Shape;\n` 
            }
            return local
        }

        function setShInProperty(element,name,item,required,last,specialCase){
            var local = ''

            
            if(!specialCase){
                local += addSpaces() + `sh:property [\n` 
            }
            
            scope++
            
            
            
            if(item != undefined){
                local += addSpaces() + `sh:path ex:${item};\n`
            }
            
            if(name == 'const' || name == 'enum'){

                elementsCount['elements'] += 1
                elementsCount['property'] += 1
                elementsCount['properties'] += 1

                try{
                    var str = ''

                    element[name].forEach(element_ => {
                        str += `"${element_}"`
                    })

                    local += addSpaces() + `sh:${constraints[name]} (${str});\n`
                } catch{
                    local += addSpaces() + `sh:${constraints[name]} ("${element[name]}");\n`
                }
            } else if(name == 'pattern' || name == "description" || name == "title" || (name == "default" && element.type == "string")){
                local += addSpaces() + `sh:${constraints[name]} "${element[name]}";\n`
            } else {
                local += addSpaces() + `sh:${constraints[name]} ${element[name]};\n`
            }

            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }

            if(!specialCase){
                local += addSpaces(-1) + `]`
                if(last){
                    local += '.\n'
                }else{
                    local +=  ';\n'
                }
            }
            
            return local
        }

        //#region NAO TA FUNCIONANDO

        function setOthersProperty(element,name,especialCase,path,last){
            var local = ''

            elementsCount['elements'] += 1
            elementsCount['property'] += 1
            elementsCount['properties'] += 1

            if(especialCase){
                local += addSpaces() + 'sh:property [\n' + addSpaces(1) + `sh:path ex:${path};\n`
            }

            if(name == 'allOf'){
                local += addSpaces() + 'sh:and (\n'
            } else if(name == 'oneOf'){
                local += addSpaces() + 'sh:xone (\n'
            } else {
                local += addSpaces() + 'sh:or (\n'
            }
            scope++
            element.forEach(element_ => {

                if('$ref' in element_){
                    try{
                        typeItem = element_.$ref.split('/')
                        if(typeItem.length == 1){
                            typeItem = element_.$ref.split('#')[1]
                        }else{
                            typeItem = element_.$ref.split('/')[2]
                        }
                    }catch{
    
                    }

                    elementsCount['elements'] += 1
                    // elementsCount['property'] += 1
                    elementsCount['properties'] += 1
    
                    if(typeItem in JS4GeoDataTypes){

                        addGeo['imports'] = true
                        addPrefixes['owl'] = true
                        addPrefixes['rdf'] = true

                        if(typeItem == 'feature' || typeItem == 'featureCollection'){
                            addGeo['feature'] = true
                        }
                        local += addSpaces() + `ex:${typeItem}Shape\n`
                    } else {
                        local += addSpaces() + `ex:${typeItem}_shape\n`
                    }
                } else {
                    if(element_.type){
                        if(element_.type in dataTypes){
                            local += addSpaces() + '[\n'
                            
                            local += setPrimitiveProperty(element_,null,checkRequired(element_,i),false)

                            local += addSpaces(-1) + ']\n'
                        } else if(element_.type == 'array'){
                            local += addSpaces() + '[\n'

                            local += setArray(element_,null,false,last=null,specialCase=true)

                            local += addSpaces(-1) + ']\n'
                        } else if(element_.type == 'object'){
                            local += addSpaces() + '[\n'

                            local += setComplexNodeShape(element_,null,false,null,false)

                            local += addSpaces(-1) + ']\n'
                        } 
                    } else if(element_.properties){
                        var prop = element_.properties
                        for(var i in prop){
                            if(prop[i].type in dataTypes){
                                local += addSpaces() + '[\n'
                                
                                scope++
                                local += setPrimitiveProperty(prop[i],i,checkRequired(prop,i),false)
    
                                local += addSpaces(-1) + ']\n'
                            } else if(prop[i].type == 'array'){
                                local += addSpaces() + '[\n'
                                
                                local += setArray(prop[i],i,false,null,specialCase=true)
    
                                local += addSpaces(-1) + ']\n'
                            } else if(prop[i].type == 'object'){
                                local += addSpaces() + '[\n'

                                scope++
                                local += setComplexNodeShape(prop[i],i,false,null,false)
    
                                local += addSpaces(-1) + ']\n'
                            } 
                        }
                    } else {
                        for(var i in element_){
                            if(element_[i].$ref){
                                local += addSpaces() + '[\n'


                                try{
                                    typeItem = element_[i].$ref.split('/')
                                    if(typeItem.length == 1){
                                        typeItem = element_[i].$ref.split('#')[1]
                                    }else{
                                        typeItem = element_[i].$ref.split('/')[2]
                                    }
                                }catch{
                
                                }
                
                                if(typeItem in JS4GeoDataTypes){

                                    addGeo['imports'] = true
                                    addPrefixes['owl'] = true
                                    addPrefixes['rdf'] = true
                                    if(typeItem == 'feature' || typeItem == 'featureCollection'){
                                        addGeo['feature'] = true
                                    }
                                    local +=  addSpaces(1) + `sh:path ex:${i};\n` + addSpaces() + `sh:node ex:${typeItem}Shape;\n`
                                } else {
                                    local +=  addSpaces(1) + `sh:path ex:${i};\n` + addSpaces() + `sh:node ex:${typeItem}_shape;\n`
                                }
    
                                local += addSpaces(-1) + ']\n'
                            } else {
                                if(element_[i].type in dataTypes){
                                    local += addSpaces() + '[\n'
                                    
                                    scope++
                                    local += setPrimitiveProperty(element_[i],i,checkRequired(element_,i),false)
        
                                    local += addSpaces(-1) + ']\n'
                                } else if(element_[i].type == 'array'){
                                    local += addSpaces() + '[\n'
                                    
                                    local += setArray(element_[i],i,false,null,specialCase=true)
        
                                    local += addSpaces(-1) + ']\n'
                                } else if(element_[i].type == 'object'){
                                    local += addSpaces() + '[\n'

                                    scope++
                                    local += setComplexNodeShape(element_[i],i,false,null,false)
        
                                    local += addSpaces(-1) + ']\n'
                                } 
                            }
                        }
                    }
                }
            })

            local += addSpaces(-1) + ')'



            if(last){
                local += '.\n'
            }else{
                local += ';\n'
            }

            if(especialCase){
                local += addSpaces(-1) + '];\n'
            }

            scope++

            return local
        }

        //#endregion

        function create_New_Complex_NodeShape(element,name){
            elementsCount['node']++

            scope = 1
            var node = `ex:${name}Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name}`

            nodesReady[name] = node + create_New_Complex_NodeShape_Structure(element,name)
        }

        function create_Complex_Property(element,name){
            var local = ''

        }

        function create_New_Complex_NodeShape_Structure(element,name){
            var local = ''
            var propertiesElements = getPropertyElements(element)

            checkUndefined(element)

            if(propertiesElements != undefined){
                
                if(isEmpty(propertiesElements)){
                    local += '.\n'
                } else {
                    local += ';\n'
                }
                for(var item in propertiesElements){
                    if(propertiesElements[item].type in dataTypes){
                        local += setPrimitiveProperty(propertiesElements[item],item,checkRequired(element,item),checkLastElement(propertiesElements,item))
                    } else if(propertiesElements[item].type == 'object'){
                        newNodes[item] = propertiesElements[item]
                        local += setComplexNodeShape(propertiesElements[item],item,checkRequired(element,item),null,checkLastElement(propertiesElements,item))
                    } else if(propertiesElements[item].type in JS4GeoDataTypes){
                        addGeo['imports'] = true
                        addPrefixes['owl'] = true
                        addPrefixes['rdf'] = true
                        if(typeItem == 'feature' || typeItem == 'featureCollection'){
                            addGeo['feature'] = true
                        }
                    } else if(propertiesElements[item].type == 'array'){
                        local += setArray(propertiesElements[item],item,checkRequired(element,item),checkLastElement(propertiesElements,item),false)
                    } else if(propertiesElements[item].$ref){
                        try{
                            typeItem = propertiesElements[item].$ref.split('/')
                            if(typeItem.length == 1){
                                typeItem = propertiesElements[item].$ref.split('#')[1]
                            }else{
                                typeItem = propertiesElements[item].$ref.split('/')[2]
                            }
                        }catch{

                        }
                        if(typeItem in JS4GeoDataTypes){
                            addGeo['imports'] = true
                            addPrefixes['owl'] = true
                            addPrefixes['rdf'] = true
                            if(typeItem == 'feature' || typeItem == 'featureCollection'){
                                addGeo['feature'] = true
                            }
                            local += setJS4GeoProperty(item,typeItem,checkLastElement(propertiesElements,item),checkRequired(element,item))
                        } else {
                            local += setComplexNodeShape(null,item,checkRequired(element,item),propertiesElements[item].$ref.split('/')[2],checkLastElement(propertiesElements,item))
                        }

                    } else if(item in anotherConstraints){
                        local += setOthersProperty(propertiesElements[item],item,null,null,checkLastElement(propertiesElements,item))
                    } else {
                        local += addSpaces() + `sh:property [\n` 
                        for(var i in propertiesElements[item]){
                            if (i in constraints){
                                local += setShInProperty(propertiesElements[item],i,item,checkRequired(element,item),checkLastElement(element,item),true)
                            }
                            else if(i in anotherConstraints){
                                local += setOthersProperty(propertiesElements[item][i],i,false,item,checkLastElement(element,item))
                            }
                        }
                        if(checkLastElement(propertiesElements,i)){
                            local += addSpaces(-1) + `].\n`
                        }else{
                            local += addSpaces(-1) + '];\n'
                        }
                    }
                }
            } else if(element != null) {
                if(element.type == 'array'){
                    local += ';\n'
                    local += setArray(element,name,checkRequired(element,name),last=true,specialCase=true)
                } else if(element.type in dataTypes){
                    local += ';\n'
                    local += setPrimitiveProperty(element,name,checkRequired(element,name),last=true)
                } 
                else if(element.type == 'object'){
                    if('allOf' in element){
                        local += ';\n'
                        local += setOthersProperty(element.allOf,'allOf',null,null,checkLastElement(element,'allOf'))
                    } else if('anyOf' in element){
                        local += ';\n'
                        local += setOthersProperty(element.anyOf,'anyOf',null,null,checkLastElement(element,'anyOf'))
                    } else if('oneOf' in element){
                        local += ';\n'
                        local += setOthersProperty(element.oneOf,'oneOf',null,null,checkLastElement(element,'oneOf'))
                    }
                    else{
                        local += '.\n'
                    }
                    
                } 
                else {
                    for(var i in element){
                        if(i in anotherConstraints){
                            local += ';\n'
                            local += setOthersProperty(element[i],i,null,null,checkLastElement(element,i))
                        } else if(i in constraints){
                            local += ';\n'
                            local += setShInProperty(element[i],i,undefined,checkRequired(element,i),checkLastElement(element,i))
                        } 
                    }
                }
            }

            return local
        }

        function setJS4GeoProperty(name,JS4GeoType,last=null,required){
            var local = ''

            elementsCount['elements'] += 1
            elementsCount['property'] += 1
            elementsCount['properties'] += 1

            if(name != null){
                if(JS4GeoType != null){
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node ex:${JS4GeoDataTypes[JS4GeoType]};\n`
                }
                if(required){
                    local += addSpaces() + `sh:minCount 1;\n`
                }

                local += addSpaces(-1) + ']'

                if(last!=null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
            }
            return local
        }

        function create_New_JS4Geo_NodeShape(element,name){
            addPrefixes['sf'] = true
            addPrefixes['dash'] = true

            addGeo['imports'] == true
            addPrefixes['owl'] = true
            addPrefixes['rdf'] = true

            if(name == 'feature' || name == 'featureCollection'){
                addGeo['feature'] = true

                newNodes['properties'] = element.definitions.feature.properties.properties

            }

            
            
            if(name == 'point'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'lineString'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'polygon'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'multiPoint'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'multiLineString'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'multiPolygon'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'feature'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 3
            } 
            else if(name == 'featureCollection'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'geometryCollection'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 2
            } 
            else if(name == 'directPosition'){
                elementsCount['elements'] += 1
                elementsCount['properties'] += 1
            }


        }
        
        //#region FUNCTIONS TO HELP

        function isEmpty(obj) {
            for(var key in obj) {
                if(obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }

        function checkLastElement(element,name){
            var index = []
            
            for(var i in element){
                index.push(i)
            }
            if(name == index[index.length-1]){
                return true
            } else {
                return false
            }
        }

        function checkUndefined(element,primitive){
            for(var i in element){
                if(!(i in constraints || i in anotherConstraints || i in jsonReservedWords)){
                    var local = `{"${i}": ${JSON.stringify(element[i])}}`

                    elementsUndefined.push({schema:local,element:i,primitive:primitive})
                } 
            }
        }
        
        function addSpaces(quant = 0){
            scope += quant
            return Array(scope*2).fill(' ').join('')
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
            t0 = performance.now()
            // setMainNodeShape(schema)
            createDefSectionElements(schema)
            defSection = false
            createSchemaSectionElementes(schema)
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

        if(addGeo['imports'] == true){
            shacl = '\n' + JS4Geo['imports'] + shacl
        }

        for(var i in addPrefixes){
            shacl = prefix[i] + '\n' + shacl
        }
        
        shacl += '\n'

        // if(addGeo['feature'] == true){
        //     shacl += JS4Geo['feature']
        // }

        log += `${elementsUndefined.length} Warnings (Elements ignored!)\n\n`

        for(var i in elementsUndefined){
            log += 'Key: ' + elementsUndefined[i].element
            if(elementsUndefined[i].primitive){
              log += ' => ATTENTION THIS IS A PRIMITIVE ELEMENT, IT MAY NOT BE ACCURATE!!!'
            }
            log += `\nElement: ${elementsUndefined[i].schema}\n\n`
        }

        t1 = performance.now()


        return {shacl:shacl,log:log,elements:elementsUndefined,time:t1-t0,count:elementsCount}
    }
}
