const fs = require('fs');
const path = require("path");

const json2xls = require('json2xls');
const Json2csvParser = require('json2csv').Parser;
const moment = require('moment');
const CronJob = require('cron').CronJob;

Object.defineProperty(Array.prototype, 'flat', {
    value: function(depth = 1){
        return this.reduce( function (flat, toFlatten){
            return flat.concat((Array.isArray(toFlatten) && (depth-1)) ? toFlatten.flat(depth-1) : toFlatten);
        }, []);
    }
});

const FOLDER_PATH = 'rawData';
const TARGET_FOLDER_PATH = 'result';
const KEYS = ["dateTime", "machine", "optGrp", "optId", "order", "lot", "X1", "X2", "Y1", "Y2", "X3", "R1", "R2", "t", "Ang1", "Ang2",
                "Vw", "Vh", "AngV", "Vr", "P1", "P2", "R1n", "R2n", "DiaA", "DiaB"]
const KEYS2 = ["dateTime", "machine", "optGrp", "optId", "order", "lot", "X1", "X2", "Y1", "Y2", "X3", "R1", "R2", "t", "Ang1", "Ang2"]

if (!fs.existsSync(TARGET_FOLDER_PATH)){
    fs.mkdirSync(TARGET_FOLDER_PATH);
}

function main(){
    const isFile = fileName => fs.lstatSync(fileName).isFile()
    const textFileLists = fs.readdirSync(FOLDER_PATH).map(fileName => path.join(FOLDER_PATH, fileName)).filter(isFile)

    let cleanedData = null;
    let transformedData = null;

    textFileLists.map( file => {
        let data = fs.readFileSync(file, 'utf8');
        let splitData = data.split("\r\n");

        [ , , DateTime, Machine, OptGrp, OptId, Order, Lot, , , , , , , , , , , , , X1, X2, Y1, Y2, X3, R1, R2, t, Ang1, Ang2,
          , , , , , , , , , , , , , , , , , , , , Vw, Vh, AngV, Vr, P1, P2, R1n, R2n, DiaA, DiaB ] = splitData;

        if (splitData.length > 51){
            cleanedData = sliceArray(DateTime, Machine, OptGrp, OptId, Order, Lot, X1, X2, Y1, Y2, X3, R1, R2, t, Ang1, Ang2, Vw, Vh, AngV, Vr, P1, P2, R1n, R2n, DiaA, DiaB);
            transformedData = KEYS.reduce((o, k, i) => ({...o, [k]: cleanedData[i]}), {})
        } else {
            cleanedData = sliceArray(DateTime, Machine, OptGrp, OptId, Order, Lot, X1, X2, Y1, Y2, X3, R1, R2, t, Ang1, Ang2);
            transformedData = KEYS2.reduce((o, k, i) => ({...o, [k]: cleanedData[i]}), {})
        }

        let jsonData = JSON.stringify(transformedData);
        //console.log(jsonData)

        let targetFIle= `${TARGET_FOLDER_PATH}/${transformedData.order} ${transformedData.lot} - ${transformedData.dateTime.replace(/\:/g,'')}.txt`;
        fs.writeFileSync(targetFIle, jsonData); 
    })

    //Read data from ETL folder now
    const transformedFileLists = fs.readdirSync(TARGET_FOLDER_PATH).map( fileName => path.join(TARGET_FOLDER_PATH, fileName));
    let TUGArr =[];
    let TTSArr =[];
    transformedFileLists.map( file => {
        let data = fs.readFileSync(file, 'utf8');

        //Make a copy, do not want to modify the original data read from JSON file lists
        let parsedData ={...JSON.parse(data)};

        parsedData.dateTime = moment(parsedData.dateTime, 'D-MM-YY hh:mm').utcOffset('+0800').format('LLL');

        if(parsedData.order.includes("TUG")){
            TUGArr.push(parsedData);
        } else if (parsedData.order.includes("TTS")){
            TTSArr.push(parsedData);
        }
    })

    //Arrange array in ascending date order
    TUGArr = TUGArr.sort( (a,b) => new Date(a.dateTime) - new Date(b.dateTime))
    TTSArr = TTSArr.sort( (a,b) => new Date(a.dateTime) - new Date(b.dateTime))

    if(TUGArr.length){
        const TUGxls = json2xls(TUGArr);
        fs.writeFileSync('TUG.xlsx', TUGxls, 'binary');

        const json2csvTUG = new Json2csvParser({KEYS});
        const TUGcsv = json2csvTUG.parse(TUGArr);
        fs.writeFileSync('TUG.csv', TUGcsv, 'binary');
    }

    if(TTSArr.length){
        const TTSxls = json2xls(TTSArr);
        fs.writeFileSync('TTS.xlsx', TTSxls, 'binary');

        const json2csvTTS = new Json2csvParser({KEYS});
        const TTScsv = json2csvTTS.parse(TTSArr);
        fs.writeFileSync('TTS.csv', TTScsv, 'binary');
    }
}

function sliceArray(...input){
    let result = [];
    input.map(el => {
        if (el === undefined) return null

        //Check for string that contains few characters starting and end with / e.g.: 29/01/19, 16:00 for fileName format
        if(/[0-9]\//.test(el.split("=").slice(1).toString())) result.push(el.split("=").slice(1).toString().replace(/\//g,'-').replace(/,/,""));

        //Check for string that contains few characters starting and end with / e.g.: TUG/EM73
        else if (/[A-Z]\//.test(el.split("=").slice(1).toString())) result.push(el.split("=").slice(1).map(el => el.slice(4,8)));

        else if (el.startsWith("Operator") || el.startsWith("Order") || el.startsWith("Ingot")) {
            result.push(el.split("=").slice(1));
        }
        else result.push(Number(el.split("=").slice(1)));
    })

    return result.flat(1);
}

//Daily Cron Job
// new CronJob('20 1 * * *', async function(){
//     console.log("Start " + new Date());
//     //Once done, stop the job
//     await main();
//     this.strop();
// }, function(){
//     //This function is executed when the job stops
//     console.log("Stop");
//     this.start();
// },
// true //Start the job right now
// );

//If want to un immediately, please comment the above code block and uncomment the bottom
main();