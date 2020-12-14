const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");
const config = require("config");
const imgur = require("imgur");


const Blocks = require("../../models/Blocks");
const SurveyPlans = require("../../models/SurveyPlans");
const Surveys = require("../../models/Surveys");

const Op = require("sequelize").Op;
const db = require("../../database/connection");
const { check, validationResult } = require("express-validator");
const sequelize = require("sequelize");
var cron = require("node-cron");
var fs = require("fs");
var Web3 = require("web3");
var infura = "https://mainnet.infura.io/v3/9d829b0bd9654959af7001c81f6da717";
// var wss = "wss://rinkeby.infura.io/v3/049318b8624a4fb19c70fb853d1a620e";
//var infura = "https://rinkeby.infura.io/v3/9d829b0bd9654959af7001c81f6da717";
var web3 = new Web3(infura);

var task = cron.schedule("* * * * *",  () =>  {




 Blocks.findOne({
    order: [
      ['id', 'DESC']
    ]
  }).then((data) =>{
    let blockNo = 0;
    if (data) {
      blockNo = data.dataValues.block_no;
    }
    var sonergy = JSON.parse(
      fs.readFileSync(__dirname + "/abi/sonergy.json", "utf8")
    );

    var contract = new web3.eth.Contract(sonergy.abi, sonergy.address);


    contract
      .getPastEvents("allEvents", {
        fromBlock: blockNo + 1,

      })
      .then(function (events) {
       
        events.forEach(function (event) {
          switch (event.event) {
            case "PriceChanged":
              if(parseInt(event.returnValues._type) == 0){
             
              let values = {
                name:  "",
                amount: web3.utils.fromWei(event.returnValues._to),
                duration: event.returnValues._duration,
                tax: 10,
                isLive: true
              }
             SurveyPlans.findOne({ where: {
              duration: event.returnValues._duration
             } })
        .then(function(obj) {
            // update
            if(obj)
                return obj.update(values).then(() =>{
                  Blocks.create({block_no: event.blockNumber})
                });
            // insert
            return SurveyPlans.create(values).then(() =>{
              Blocks.create({block_no: event.blockNumber})
            });
        })
      }
              break;
            case "Paid":
              Surveys.update({
                is_survey_published: true,
                has_paid_for_survey: true,
                duration: event.returnValues._duration
                  
                }, {
                  where: {
                    id: event.returnValues.survey_id
                  }
                }).then((res) => {
                  Blocks.create({block_no: event.blockNumber})
                })
              break;
            
               
            default:
              break;
          }
          
        });
        
        // let data = await Product.decrement({quantity: qty}, { where: { id, quantity: {
        //   [Op.gte]: qty
        // } } });
        console.log(events);
      })
    console.log("Running", blockNo);
  })


 
});













module.exports = router;
