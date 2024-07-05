require('dotenv').config();
const fs = require('fs');
const { version } = require('os');
const exec = require('child_process').exec;
const latestCommit = null;

exec('git rev-parse --verify HEAD', (err, stdout, stderr) => {
    // git log -n 1 --pretty=format:"%H"
    if (err) {
        console.error(`error: ${err}`);
        return;
    }

    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    this.latestCommit = stdout;
    var data = `var data = {"version": "${stdout}"};\nexport {data}`
    fs.writeFileSync('dist/version.js', data);
})

