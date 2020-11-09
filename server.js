
module.exports = {
    startServer: function(){
        const express = require('express')
        const handlebars = require('express-handlebars')
        const path = require('path')
        const bodyParser = require('body-parser')
        const app = express()
        const tools = require('./conversor')
        
        // CONFIG
        app.engine('handlebars',handlebars({defaultLayout:'main'}))
        app.set('view engine','handlebars')
        
        app.use(bodyParser.json({limit: '50mb'}))
        app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
        
        app.use(express.static(path.join(__dirname,'public')))
        
        // ROTAS
        app.get('/',(req,res)=>{
            res.render('./pages/index')
        })
        
        app.post('/check',(req,res)=>{
            if(req.body.schema != '' && req.body.quantity != ''){
                var result = tools.check(req.body.schema,req.body.quantity)
                res.render('./pages/index',{schema:req.body.schema,shacl:result.shacl,resultado:result.text,log:result.log,time:result.time,runs:result.runs})
            } else {
                var result = ''
                if(req.body.schema == ''){
                    result += 'JSON Schema not provided! '
                }
                if(req.body.quantity == ''){
                    result += 'No specification of how many runs!'
                }
                res.render('./pages/index',{schema:req.body.schema,resultado:result})
            }
            
        })
        
        
        // PORT
        const PORT = process.env.PORT || 8080
        app.listen(PORT,()=>{
            console.log(`Server running in localhost:${PORT}`)
        })
    }
}
