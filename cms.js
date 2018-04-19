import fs from 'fs';
import path from 'path';
import url from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import timestamp from 'time-stamp';
import formidable from 'formidable';
import jsonfile from 'jsonfile';
const log = console.log;
const app = express();


const config = {
	homePath	: path.join(__dirname,'/client/home'),
	managerPath : path.join(__dirname,'/client/manager'),
	staticPath  : path.join(__dirname,'/client/static'),
	dataListFile: path.join(__dirname, '/db/list.json'),
	dataBaseLib : path.join(__dirname, '/db'),
	ListContent : null
};

config.init = function() {
	this.creatAndReadFile( config.dataListFile, {List: []}, (data) => {
		if(data){
			log(`List file content ${data}`);
			config.ListContent  = JSON.parse( data );
			log( config.ListContent );
		} else {
			config.ListContent  = [];
		}
	});
};
config.creatAndReadFile = function(filePath, defaultConent, callback) {
	let cb = null;
	if(typeof defaultConent == 'function') {
		cb = defaultConent
		defaultConent = {};		
	} else {
		cb = callback;
	};
	fs.stat(filePath, (err) => {
		if (err) {
			log(filePath);
			fs.writeFile(filePath, JSON.stringify( defaultConent ), (err) => {
				if( err ) throw err;
				try {
					cb();
				}catch (err){
					console.log(err);
				};
				console.log(`created file ${filePath}`);
			})
		} else {
			fs.readFile(filePath,'utf-8', (err, data) => {
				if(err) throw err;
				console.log(`readed file ${filePath}`);
				try {
					cb(data);
				} catch(err) {
					console.log(err);
				};
			})
		};
	});
};
config.createFile = function(filePath, defaultConent, callback) {
	fs.writeFile(filePath, JSON.stringify( defaultConent ), (err) => {
		if( err ) throw err;
		try {
			callback();
		}catch (err){
			console.log(err);
		};
	});	
};
config.deletFile = function(filePath, callback) {
	log( filePath );
	fs.unlink(path.join( config.dataBaseLib, filePath+'.json'), (err) => {
	  if (err) throw err;
	  callback()
	});
};
config.upgradeList = function(id) {
	log(filePath);
	delete config.ListContent[id];
	let idIndex = config.ListContent.List.indexOf( id );
	if(idIndex === -1) config.ListContent.List.splice(idIndex,1);

	fs.writeFile(filePath, config.ListContent, (err) => {
		if( err ) throw err;
		console.log(`created file ${filePath}`);
	})
};
config.template = function(args) {
	let _args = {
		list : args.list || [],
		title : args.title || 'null',
		content : args.content || 'null' 
	};
	let html  = '<!DOCTYPE html><html><head><title>OWLYME BLOG</title>';
		html += '<link href="https://cdn.bootcss.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet"></head><body>';
		html += '<div class="container"><div class="row"> <div class="col-md-3 col-sm-3"><ul class="list-group">';
		html += rednerList(_args.list);
		html +=	'</ul></div><div class="col-md-9 col-sm-9"><div id="article-container">';
		html += 	'<h2>'+ _args.title +'</h2>';
		html += 	'<div>'+ _args.content +'</div>';
		html +=	'</div></div></div></div>';
  		html += '</body></html>';
	function rednerList(list){
		let lis = '';
		list.forEach((item, index) => {
			lis += '<li class="list-group-item"><a href="'+ item +'" target="_self" >'+ item +'</a></li>';
		});
		return lis;
	};
	return html;
};

config.init();

//settng router ---------------------------------------------------------
app.use( bodyParser.json({limit: '5mb'}));
app.use( bodyParser.urlencoded({limit: '5mb', extended: true}) );
// app.use( express.static( config.staticPath) );

//get client index.html
app.get('/',(req, res) => {
	res.send( config.template({
		list : config.ListContent.List,
		title : 'Hi i am owly',
		content : 'Welcome to read my blog!'
	}) );
}); 
//get manager index.html
app.get('/admin',(req, res) => {
	res.sendFile( config.managerPath+'/index.html');
});
app.post('/manager',(req, res) => {
	console.log('/manager req.body.id', req.body);
	var id = req.body.id,
		article = path.join( config.dataBaseLib, id+'.json');

	fs.stat(article, (err) => {
		if (err) {
			res.redirect("/admin");
			console.log(`${article} does not exist.`);
		} else {
			fs.readFile(article,'utf-8', (err, data) => {
				if(err) throw err;
				console.log(`readed file ${article}`);
				res.send( JSON.parse(data) );
			});
		};
	});	
	return;
});

//get data list 
app.get('/list', (req, res) =>{
	res.send( JSON.stringify( config.ListContent.List) )
});
//create article
app.post('/new', (req, res) => {
	let body = req.body;
	if ( !body.title ) res.send('title cannot be null');
	if ( !body.content ) res.send('content cannot be null');
	const _timestamp = Date.now();

	if( !config.ListContent[_timestamp] ){
		config.ListContent[_timestamp] = 1;
		config.ListContent.List.unshift(_timestamp);		
	}else {
		res.send('this file is existed, do your wang to upgrade it？');
	}
	let filePath = path.join( config.dataBaseLib, _timestamp+'.json');
	config.createFile(filePath, body, ()=> {
		config.createFile( config.dataListFile, config.ListContent, ()=> {
			res.send('save success！');
		});
	});
});
// delete artile 
app.post('/delete', (req, res) => {
	let id = req.body.id;
	log('delete');
	config.deletFile( id, () => {
		res.send('Deleted successfully!');
		console.log('deleted successfully');
	});
});
// get article file
app.get("/:id",(req, res) => {
	log('id')
	let resposeData = null;
	let id = req.params.id,
		article = path.join(config.dataBaseLib, id+'.json');

	fs.stat(article, (err) => {
		if (err) {
			res.redirect("/");
			console.log(`${article} does not exist.`);
		} else {
			fs.readFile(article,'utf-8', (err, data) => {
				if(err) throw err;
				console.log(`readed file ${article}`);	
				resposeData = JSON.parse(data);
				res.send( config.template({
					list : config.ListContent.List,
					title: resposeData.title,
					content : resposeData.content
				}) );
			});
		};
	});	
});

// 定制404 页面
app.use(function(req, res){
	res.status(404);
	res.send('404');
});
// 定制500 页面
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.send('500');
});


function judgeAndReadFile(filePath, callback) {
	fs.stat(filePath, (err) => {
		if (err) {
			try {
				callback();
			} catch(err) {
				console.log(err);
			};
			console.log(`${filePath} does not exist `);			
		} else {
			fs.readFile(filePath,'utf-8', (err, data) => {
				if(err) throw err;
				console.log(`readed file ${filePath}`);				
				try {
					callback(data, req, res);
				} catch(err) {
					console.log(err);
				};
			})
		};
	});
};

//start server ------------------------------------
app.listen('3000', ()=> {
	log('server listening on port 3000');
});


