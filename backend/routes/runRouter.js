const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { format } =require('date-fns');
const multer = require('multer');
const fileModel = require('../models/fileModel');
const { exec } = require('child_process'); // 執行 shell
const fs = require('fs');
const os = require('os');
const path = require('path');

const { v4: uuidv4 } = require('uuid');

let queue = []; // 佇列
let isRunning = false; // 檢查是否在運行計算

// Step 1. 建構 python 程式碼
router.post('/run/code',(req, res) => {
    try{
        const tempFilePath = path.join(os.tmpdir(), 'temp.json');
        const pyFilePath = path.join(__dirname, 'parser/json_parser.py');
        const jsonObject = req.body.json;
        fs.writeFileSync(tempFilePath, jsonObject, 'utf8');
        exec(`python ${pyFilePath} ${tempFilePath}`, (error, stdout, stderr) => {
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
    const sourceFilePath = path.join(__dirname, '/config/config.yaml');
    const targetDir = path.join(fPath, 'conf');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetFilePath = path.join(fPath, 'conf', 'config.yaml');
    fs.copyFile(sourceFilePath, targetFilePath, (err) => {});
    /* 寫入 config.yaml 結束 */

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
            outputRoute: ''
        })
        .then((data, err) => {
            queue.push({uuid:uuid,name:name,path:fPath});
            if(!isRunning) runModule();
            res.status(200).send('success');
        })
    } catch (err) {
        res.status(200).send('伺服器錯誤');
    }
});

function saveFiles(files,src,uuid){
    const folderName = `${uuid}`;
    const folderPath = path.join(__dirname, '../../../workspace/modulus-sym/examples/aneurysm'); // 這之後要修改
    const stlFolderPath = path.join(folderPath,'stl_files');
    fs.mkdirSync(stlFolderPath, { recursive: true });
    try {
        files.forEach(file => {
            const filePath = path.join(stlFolderPath, file.originalname);
            fs.writeFileSync(filePath, file.buffer);
        });
        fs.writeFileSync(path.join(folderPath, 'main.py'),src.buffer);
    } 
    catch (err) {console.error(err);} 
    finally {return folderPath;}
}

function deleteFolder(folderPath) { // 刪除資料夾
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(folderPath);
    }
}

// Step 3. 執行 python module
function runModule(){
    isRunning = true;
    if(queue.length == 0){
        isRunning = false;
        return;
    }
    var target = queue[0];
    updateFileStatus(target.uuid,'Running');
    exec(`python ${target.path}/main.py`,(error,stdout,stderr)=>{
        console.log('end');
        updateFileStatus(target.uuid,'Ready');
        replaceFile(target.uuid,target.name,target.path)
        queue.pop();
        runModule();
    })
}

// Step 4. 修改狀態 Running or Ready
async function updateFileStatus(uuid,status){
    fileModel.updateOne(           
        { uuid: uuid },
        { $set: { status: status } }
    ).then(res=>{})
};

// Step 5. 取代檔案
async function replaceFile(uuid,name,path) {
    fileModel.updateOne({uuid:uuid},{
        $set: {
            outputName: name+'.zip',
            outputRoute: path+'/outputs'
        },
    }).then(res=>{})
}

// 下載檔案
router.post('/run/download', async (req, res) => {
    const folderPath = req.body.route;
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

// 查看檔案
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

// 刪除檔案
router.delete('/run/delete', async (req, res) => {
    var fileId = req.body.fileId;
    var route = req.body.route;
    if(!fileId || !route) return res.send('Failed To Detele Project');
    fileModel.deleteOne({uuid:fileId})
    .then(data=>{
        if(data.deletedCount){
            deleteFolder(route);
            res.send('success');
        }
        else res.send('Failed To Detele Project');
    })
});

module.exports = router;