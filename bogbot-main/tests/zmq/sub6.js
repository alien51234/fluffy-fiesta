const zmq = require("zeromq")

let _sync = false

async function listen() {
  const sock = new zmq.Subscriber

  sock.connect("tcp://127.0.0.1:3000")
  sock.subscribe("kitty cats")
  console.log("Subscriber connected to port 3000")

  for await (const [topic, msg] of sock) {
    console.log("received a message related to:", topic, "containing message:", msg)
_sync=!_sync
  }
}


async function _main(){
while(true){
if(_sync) console.log('hello')
await new Promise(resolve => setTimeout(resolve, 1000));
}

}

listen()
_main()
