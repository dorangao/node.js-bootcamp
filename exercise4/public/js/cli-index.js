// Node-style (commonjs) require in the browser!
let $ = require('jquery')
let io = require('socket.io-client')
let socket = io.connect('http://127.0.0.1:8000')
let username=cleanInput($('#username').val());
// ESNext in the browser!!!
socket.on('connect', ()=>console.log('connected'))

// Enable the form now that our code has loaded
$('#send').removeAttr('disabled')

let $template = $('#template')

socket.on('im', logMsg);

$('form').submit(() => {
  let msg=cleanInput($('#m').val());

  socket.emit('im', msg)
  logMsg({username,msg})
  $('#m').val('')
  return false
})

function logMsg(chat)
{
  let $li = $template.clone().show()
  $li.children('i').text(chat.username+': ');
  $li.children('span').text(chat.msg)
  $('#messages').append($li)
}

// Prevents input from having injected markup
function cleanInput (input) {
  return $('<div/>').text(input).text();
}
