import { data } from "/dist/version.js";

var done;
function saveToLocalstorage() {
  const version = data.version;
  if (!done) {
    done = true;
    localStorage.setItem("version", version);
  }
}

function getLocalVersion() {
  const version = localStorage.getItem("version");
  return version
}

async function gatherData() {
  const version = data.version;
  const localVersion = await getLocalVersion();
  console.log("localVersion:");
  console.log(localVersion);

  console.log("version:");
  console.log(version);
  console.log(version.includes(localVersion));
  if (!version.includes(localVersion)) {
    window.dispatchEvent(
      new CustomEvent("versionchanged", { detail: version }),
    );
  }
}

function start() {
  setInterval(gatherData, 600000);
}

window.addEventListener("versionchanged", function (e) {
  alert("Unmacthed version. New UI version available!");
});


saveToLocalstorage()
window.addEventListener("load", start);
