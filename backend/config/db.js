const mongoose = require('mongoose')

function DbConnection(){
    mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log("Database connected")
    }).catch(()=>{
        console.log("Database is not connected")
    })
}

module.exports = DbConnection