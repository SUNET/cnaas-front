import {data} from '/dist/version.js'

async function getData() {
  const url = `${process.env.API_URL}/api/v1.0/system/version`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  const json = await response.json();
  return json.data;
}

async function gatherData() {
    const version = data.version;
    const dataFrGit = await getData();
    const gitVersion = dataFrGit.version;
    const gitVersionSummary = dataFrGit.git_version;
    console.log("Data:")
    console.log(version)
    
    console.log("dataFrGit:")
    console.log(dataFrGit)
    console.log(gitVersion)
    console.log(gitVersionSummary)
    console.log(gitVersionSummary.includes(version))
    if(!gitVersionSummary.includes(version)) {
        window.dispatchEvent(new CustomEvent('versionchanged', { detail: version }));
    }
}

function start() {
    setInterval(gatherData, 8000);
}

window.addEventListener('versionchanged', function (e) {
    alert('Unmacthed version. New UI version available!');
});

window.addEventListener('load', start);
