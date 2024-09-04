const { Worker, isMainThread } = require('worker_threads');

if (isMainThread) {
  console.log('Inside Main Thread!');
  
  // re-loads the current file inside a Worker instance.
  new Worker(__filename);
} else {
  console.log('Inside Worker Thread!');
  console.log(isMainThread);  // prints 'false'.
}
