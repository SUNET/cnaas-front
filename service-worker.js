// self.addEventListener('message', (event) => {
//     if (event.data === 'SKIP_WAITING') {
//         self.skipWaiting();
//     }
// });


onmessage = function (e) {
    // do some magic here
    console.log("WORKER: I am all done, back to you, main application code.");
    postMessage('I am all done, back to you, main application code.');
  };


self.addEventListener("install", event => {
    console.log("WORKER: install event in progress.");
});


self.addEventListener("activate", event => {
    console.log("WORKER: activate event in progress.");
});



self.addEventListener("fetch", event => {
    console.log('WORKER: Fetching...¡¡¡¡¡', event.request);
  });

self.addEventListener('sync', event => {
if (event.tag === 'benmak') {
    console.log("SYNCING.......")
}
});
  