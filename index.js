const express = require('express');
const app = express();
const socketio = require('socket.io');//madar datos en tiempo real
//para ello se necesita una conexion http
const http=require('http');
//inicializar http y pasamos modulo del servidor
const mysql = require('mysql')
const bodyParser = require('body-parser');

const server=http.createServer(app); //devuelve un objeto de servidor
const io=socketio.listen(server); //devuelve conexion de sockets
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const parser = new Readline();

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

var client = mysql.createConnection({
  user: 'root',
  host: 'localhost',
  database: 'drennode',
  password: '',
  //port: 5432,
})
//const client = new Client(connectionData)

function gettime(){
  var t=new Date;
  var year= t.getFullYear();
  var mon=t.getMonth()+1;
  var day = t.getDate()
  var hour=t.getHours();
  var min=t.getMinutes();
  var sec=t.getSeconds();
  var h = year+"-"+mon+"-"+day+" "+hour+":"+min+":"+sec;
  return h;
}

// client.connect(function(err){
//   if(err) throw err;
//   console.log('connected');
//   client.query("create table Registro(hora timestamp,distancia int)", function (err, result) {
//   console.log(result);
//   client.end()
//   })
// })

io.on('connection',function(socket){
   console.log('A new socket connection');
   socket.on('chat', function(msg){
    console.log("----------message-------",msg);
  });
});

app.get('/',(req,res,next) => {
   res.sendFile(__dirname+'/html/index.html');
});
app.get('/historial',(req,res,next) => {
   res.sendFile(__dirname+'/html/Historial.html');
});
var salv = ""
const mySerial = new SerialPort('COM6', {
  baudRate: 115200
});

mySerial.on('open', function () {
  console.log('Opened Port');
});
mySerial.on('data',function(data){ //datos
  d=salv
  console.log("Empieza");
  for(x of data.toString()){
    console.log(x,"----");
    if (x==",") {
      if(parseInt(d)<700){
        h=gettime()
        io.emit('arduino:data',{//manda a cliente
          value:d.toString()
        });
        client.query("insert into registro (hora,distancia) values('"+h+"','"+d+"')", function(err,result){
          if(err) throw err;
          console.log("Insertado");
        })
      }
      console.log("Hello",d);
      salv=""
    }else {
      if (x!=" " && x!="\n" && x!="\r") {
          d+=x
          salv=d
      }
    }
  }
});

app.post('/historial', function(req, res){
  client.connect(function(err,result){
    var consulta;
    if(req.body.tipo==1) consulta="select * from registro where hora like '"+req.body.fecha+" "+req.body.hora+"%'";
    else consulta="select * from registro where hora between '"+req.body.de+"%' and '"+req.body.a+"%'";
    client.query(consulta,function(err,result){
      console.log(result)
      if(err){
        console.log(err);
      }else{
        result.forEach(function(dato){
          var tiempo= dato.hora.toString().split("GMT")
          dato.hora= tiempo[0];
        })
        if(result.length == 0) res.json(0)
        else res.json(result)
      }
    })
  })
});
server.listen(3000, () => {
    console.log('server on port',3000);
});
