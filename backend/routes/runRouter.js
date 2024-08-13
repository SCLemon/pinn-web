const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { format } =require('date-fns');
const multer = require('multer');
const fileModel = require('../models/fileModel');
const { exec,spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// docker container
const containerID = 'Container ID'

runModule(); // 初始化

// Step 1. 建構 python 程式碼 <-- 無需修改
router.post('/run/code',(req, res) => {
    try{
        const tempFilePath = path.join(os.tmpdir(), 'temp.json');
        const pyFilePath = path.join(__dirname, 'parser/json_parser.py');
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
router.post('/run/upload',upload.fields([
    { name: 'stlFiles', maxCount: 50 },
    { name: 'code', maxCount: 1 }
])
,(req, res) => {
    var files = req.files['stlFiles'];
    if(!files) return res.status(200).send('STL 資料不可為空');
    const uuid = uuidv4();
    var src = req.files['code'][0];
    var token = req.headers['user-token'];
    var fPath = saveFiles(files,src,uuid);
    /* 寫入 config.yaml 開始*/
    const sourceFilePath = path.join(__dirname, '/static/config.yaml');
    const targetDir = path.join(__dirname, fPath, 'conf');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetFilePath = path.join(__dirname, fPath, 'conf', 'config.yaml');
    fs.copyFile(sourceFilePath, targetFilePath, (err) => {});
    /* 寫入 config.yaml 結束 */

    /* 覆蓋 main.py 開始 */ // 之後要刪掉
    const aneurysmPath = path.join(__dirname, '/static/aneurysm.py');
    const destinationFilePath = path.join(__dirname, fPath, `${uuid}.py`);
    fs.readFile(aneurysmPath, 'utf8', (err, data) => {
        fs.writeFileSync(destinationFilePath, data, 'utf8');
    })
    /* 覆蓋 main.py 結束 */

    var name = `${format(new Date(),'HHmm')}_project`;
    try {
        fileModel.create({
            token:token,
            uuid:uuid,
            name:name,
            date: format(new Date(),'yyyy/MM/dd'),
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
    const process = spawn(command, args);
    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    process.on('close', async (code) => {
        console.log(`child process exited with code ${code}`);
        await updateFileStatus(target.uuid, 'Ready');
        await replaceFile(target.uuid, target.name);
        await runModule();
    });
}
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
    if(!fileId || !input || !output) return res.send('Failed To Detele Project');
    fileModel.deleteOne({uuid:fileId})
    .then(data=>{
        if(data.deletedCount){
            deleteFolder(input);
            deleteFolder(output);
            res.send('success');
        }
        else res.send('Failed To Detele Project');
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
module.exports = router;