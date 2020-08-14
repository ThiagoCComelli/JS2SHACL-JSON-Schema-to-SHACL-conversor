function setOthersProperty(element,name,especialCase,path){
    var local = ''

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
    element.forEach(element_ => {
        for(var i in element_){
            // i != 'description' && i != 'additionalProperties'
            if(true){
                if(i != '$ref'){
                    local += addSpaces(1) + '[\n'
                    scope++
                    if(element_[i].type in dataTypes){
                        
                        local += setPrimitiveProperty(element_[i],i,checkRequired(element,i))
                        
                    } else if(element_[i].type == 'array'){

                        local += setArray(element_[i],i,checkRequired(element,i))

                    } else if(element_[i].type == 'object'){

                        local += setComplexNodeShape(element_[i],i,checkRequired(element,i))

                    } else if (i in anotherConstraints){

                        local += setOthersProperty(element_[i],i)
                        
                    } else if(i in constraints){
                        if(i == 'enum' || i == 'const'){
                            local += setShInProperty(element_,i)
                        }
                    } else if(i == 'type'){
                        if(element_[i] == 'object'){
                            local += setComplexNodeShape(element_,null)
                        } else if(element_[i] == 'array'){
                            local += setArray(element_,name,null,null,true)
                        } else if(element_[i] in dataTypes){
                            local += setPrimitiveProperty(element_[i],null)
                        }
                    } else if(element_[i].$ref){
                        // local += setComplexNodeShape(element_[i].$ref,i)
                        local +=  addSpaces() + `sh:path ex:${i};\n` + addSpaces() + `sh:node ex:${element_[i].$ref.split('/')[2]}_shape;\n`
                    }

                    scope -= 2
                    local += addSpaces(1) + ']\n'
                } else {
                    // local += addSpaces(1) + '[\n'
                    scope += 1
                    local += addSpaces() + `ex:${element_[i].split('/')[2]}_shape\n`
                    // scope -= 1
                    // local += addSpaces(1) + ']\n'
                }
                scope--
            }
            
        }
    })
    local += addSpaces() + ');\n'

    if(especialCase){
        local += addSpaces(-1) + '];\n'
    }

    return local
}