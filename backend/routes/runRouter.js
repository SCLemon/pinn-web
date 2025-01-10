const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { format } =require('date-fns');
const multer = require('multer');
const fileModel = require('../models/fileModel');
const userModel = require('../models/userModel');
const { exec,spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// docker container
const containerID = 'Container ID'

runModule(); // 初始化

// Step 1. 建構 python 程式碼 <-- 無需修改
router.post('/run/code',(req, res) => {
    try{
        const tempFilePath = path.join(os.tmpdir(), 'temp.json');
        const pyFilePath = path.join(__dirname, 'parser/gen_py.py');
        const jsonObject = req.body.json;
        fs.writeFileSync(tempFilePath, jsonObject, 'utf8');
        exec(`python3 ${pyFilePath} ${tempFilePath}`, (error, stdout, stderr) => {
            // 刪除臨時文件
            try{fs.unlinkSync(tempFilePath);}
            catch(e){}
            finally{res.send(stdout);}
        });}catch(e){res.send('');}
});
router.post('/run/yaml',(req, res) => {
    try{
        const tempFilePath = path.join(os.tmpdir(), 'temp2.json');
        const pyFilePath = path.join(__dirname, 'parser/gen_yaml.py');
        const jsonObject = req.body.json;
        fs.writeFileSync(tempFilePath, jsonObject, 'utf8');
        exec(`python3 ${pyFilePath} ${tempFilePath}`, (error, stdout, stderr) => {
            // 刪除臨時文件
            try{fs.unlinkSync(tempFilePath);}
            catch(e){}
            finally{res.send(stdout);}
        });}catch(e){res.send('');}
});

// Step 2. 資料建立
const upload = multer();
router.post('/run/upload/:name',upload.fields([
    { name: 'stlFiles', maxCount: 50 },
    { name: 'code', maxCount: 1 },
    { name: 'yaml', maxCount: 1 }
])
,(req, res) => {
    var files = req.files['stlFiles'];
    if(!files) return res.status(200).send('STL 資料不可為空');
    const uuid = uuidv4();
    var src = req.files['code'][0];
    var yaml = req.files['yaml'][0];
    var token = req.headers['user-token'];
    var fPath = saveFiles(files,src,uuid);
    
    // 寫入 yaml
    const targetDir = path.join(__dirname, fPath, 'conf');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetFilePath = path.join(__dirname, fPath, 'conf', 'config.yaml');
    fs.writeFileSync(targetFilePath,yaml.buffer,'utf8');

    // 寫入 python file
    const destinationFilePath = path.join(__dirname, fPath, `${uuid}.py`);
    fs.writeFileSync(destinationFilePath,src.buffer,'utf8')

    var name = req.params.name;
    try {
        fileModel.create({
            token:token,
            uuid:uuid,
            name:name,
            date: format(new Date(),'yyyy/MM/dd HH:mm:ss'),
            status:'Queuing',
            inputRoute:fPath,
            outputName: '',
            outputRoute:'',
            done:false,
        })
        .then((data, err) => {
            runModule();
            res.status(200).send('success');
        })
    } catch (err) {
        res.status(200).send('伺服器錯誤');
    }
});

function saveFiles(files,src,uuid){
    const folderName = `${uuid}`;
    const folderPath = path.join('../../../workspace/modulus-sym/examples',folderName);

    const stlFolderPath = path.join(__dirname,folderPath,'stl_files');
    fs.mkdirSync(stlFolderPath, { recursive: true });
    try {
        files.forEach(file => {
            const filePath = path.join(stlFolderPath, file.originalname);
            fs.writeFileSync(filePath, file.buffer);
        });
        fs.writeFileSync(path.join(__dirname,folderPath, `${uuid}.py`),src.buffer);
    } 
    catch (err) {console.error(err);} 
    finally {return folderPath;}
}
// Step 3. 執行 python module
var currentProcess = 0;
var child = undefined; // 當前運行執行緒
var log = '';
async function runModule(){
    const res = await fileModel.findOne({done:false})
    if(res == null){
        console.log('process end');
        return;
    }
    if(res.uuid == currentProcess){
        console.log('wait for process');
        return;
    }
    currentProcess = res.uuid;
    var target = res;
    await updateFileStatus(target.uuid,'Running');
    const command = 'docker';
    const args = ['exec', containerID, 'python', `modulus-sym/examples/${res.uuid}/${res.uuid}.py`];
    child = spawn(command, args);
    child.stdout.on('data', (data) => {
        log += `${data} <br>`
        console.log(`${data}`);
    });
    child.stderr.on('data', (data) => {
        log += `${data} <br>`
        console.error(`${data}`);
    });
    child.on('close', async (code) => {
        log += `child process exited with code ${code} <br>`
        console.log(`child process exited with code ${code}`);
        await updateFileStatus(target.uuid, 'Ready');
        await replaceFile(target.uuid, target.name);
        await runModule();
        sendMail(target)
    });
}

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
wss.on('connection', (ws) => {
    ws.send(log);
    if(child){
        child.stdout.on('data', (data) => {
            ws.send(data)
        });
        child.stderr.on('data', (data) => {
            ws.send(data)
        });
        child.on('close', async (code) => {
            ws.send(`child process exited with code ${code}`);
        });
    }
});


// 修改狀態 Running or Ready <-- 無需修改
async function updateFileStatus(uuid,status){
    var done = status == 'Ready';
    await fileModel.updateOne(           
        { uuid: uuid },
        { $set: { status: status , done: done } }
    )
};

// Step 5. 取代檔案
async function replaceFile(uuid,name) {
    await fileModel.updateOne({uuid:uuid},{
        $set: {
            outputName: name+'.zip',
            outputRoute: `../../../workspace/outputs/${uuid}`
        },
    }).then(res=>{})
}

// 刪除資料夾 ( 接收相對路徑 ) <-- 無需修改 
function deleteFolder(folderPath) { 
    const target = path.resolve(__dirname, folderPath);
    if (fs.existsSync(target)) {
        const files = fs.readdirSync(target);
        for (const file of files) {
            const curPath = path.join(target, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(target);
    } 
}
// 下載檔案 <-- 無需修改
router.post('/run/download', async (req, res) => {
    const folderPath = path.join(__dirname,req.body.route);
    const fileName = req.body.name;
    const outputPath = path.join(__dirname,'output.zip');
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {zlib: { level: 9 }});
    output.on('close', () => {
        res.download(outputPath, fileName, (err) => {
            if (err) console.error('Error sending file:', err);
            else fs.unlinkSync(outputPath);
        });
    });
    archive.on('error', (err) => { throw err;});
    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
});
// 刪除檔案 <-- 無需修改
router.delete('/run/delete', async (req, res) => {
    var fileId = req.body.fileId;
    var input = req.body.inputRoute;
    var output = req.body.outputRoute;
    fileModel.deleteOne({uuid:fileId})
    .then(data=>{
        if(data.deletedCount){
            if(input!='') deleteFolder(input);
            if(output!='') deleteFolder(output);
            res.send({
                type:'success',
                message:'刪除成功！'
            })
        }
        else res.send({
            type:'error',
            message:'刪除失敗！'
        });
    })
});

// 查看檔案 <-- 無需修改
router.get('/run/findAll', async (req, res) => {
    var token = req.headers['user-token'];
    try {
        fileModel.find({token: token })
        .then(data=>{
            var output = data.map(obj=>{
                return {
                    id: obj.uuid,
                    status:obj.status,
                    filename:obj.name,
                    date:obj.date,
                    output:obj.outputName,
                    outputRoute:obj.outputRoute,
                    inputRoute:obj.inputRoute
                }
            })
            res.status(200).send(output);
        })
    } catch (err) {
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// 停止運行
router.get('/run/kill/:uuid',(req,res)=>{
    var uuid = req.params.uuid;
    if(currentProcess == uuid){
        child.kill('SIGTERM');
        exec(`docker top ${containerID} | grep "${uuid}.py" | awk '{print $2}'`, (error, stdout, stderr) => {
            const pid = stdout.trim();
            // 進一步終止進程
            exec(`kill -9 ${pid}`, (killError) => {
                res.send({
                    type:'success',
                    message:'執行緒已中止！'
                });
            });
        });
    }
    else{
        res.send({
            type:'error',
            message:'執行緒中止失敗！'
        });
    }
    currentProcess = 0;
    child = {};
})

// 寄發信件
const mailConfig ={
    service: 'Gmail',
    auth: {
        user: 'blc0000421@gmail.com', // Mail Account
        pass: 'ujpmxjrnjhsymdar' // https://myaccount.google.com/apppasswords
    }
}

function sendMail(target){
    userModel.findOne({token:target.token})
    .then(res=>{
        const transporter = nodemailer.createTransport(mailConfig)
        var str = 
        `
        <div> 您於 ${target.date} 進行的 ${target.name} 已於本平台執行完畢！ </div>
        `
        const mailOptions = {
            to: res.mail,
            subject: 'PINNs Platform - 專案運行結果通知',
            html: str
        }
        transporter.sendMail(mailOptions, (err, info) => {})
    })
    .catch(()=>{})
}

module.exports = router;