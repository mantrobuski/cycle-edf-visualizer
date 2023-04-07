class Task
{
	constructor(name, release, execution, period, deadline, colour)
	{
		this.name = name;
		this.release = release;
		this.execution = execution;
		this.period = period;
		this.deadline = deadline;
		this.relative = deadline - release;
		this.colour = colour;

		this.nextDeadline = deadline;
		this.nextRelease = release;

		this.executions = 0; //this is so I have to do less math
	}

	//see if a task is possible (based only on itself)
	validate()
	{
		//tasks deadline is before it's released
		if(this.release > this.deadline) return false;
		else if(this.release + this.execution > this.deadline) return false; //not enough time to complete before deadline
		else if(this.period < this.execution) return false; //period is too fast for exectution time
		else if(this.release < 0 || this.execution < 0 || this.deadline < 0 || this.period < 0) return false; //negative values input


		return true;
	}
}

let taskCount = 1;
let tasks = [];

//initially hide the rates selector
let freqFixed = false;
$('#rates').hide();
$('#rates').change(function()
{
	if($(this).val() == 'any') freqFixed = false;
	else freqFixed = true;

	generate();
});

//changes the background colour of the input box to match the entered hex value
$('input').on('input', function(e)
{
	$(this).css('backgroundColor', $(this).val());
});


function newTask()
{
	//https://css-tricks.com/snippets/javascript/random-hex-color
	//generates random colour
	let randomColor = Math.floor(Math.random()*16777215).toString(16);

	$('#in').append(`<tr class="taskInput" id="T` + ++taskCount + `"><td><input type="text" value="T` + taskCount + `"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="text" value="#` + randomColor + `" style="background-color: #` + randomColor + `"><input type="button" class="delete" value="X" title="Delete task?" onclick="deleteTask(` + taskCount + `)"></td></tr>`);

	$('input').on('input', function(e)
	{
		$(this).css('backgroundColor', $(this).val());
	});
}


function deleteTask(id)
{
	console.log('deleting task: ' + id);
	$('#T' + id).remove();
}

function loadTasks()
{
	let valid = true;
	let out = [];

	//for each input row
	$('.taskInput').each(function(i)
	{
		let vals = [];
		//for each data point in the task
		$('input:not([button])', this).each(function()
		{
			if($(this).val() == '')
			{
				console.log('no val');
				valid = false;
				return false;
			}

			vals.push($(this).val());
		});

		if(vals.length < 6)
		{
			console.log('wrong length');
			valid = false;
			return false;
		}

		//just hard code this
		out.push(new Task(vals[0], Number(vals[1]), Number(vals[2]), Number(vals[3]), Number(vals[4]), vals[5]));
	});


	//somewhere the valid flag was flipped
	if(!valid) 
	{
		alert('Missing values!');
		return false;
	}
	return out;
}

//make this global
let simLength;

function generate()
{

	tasks = loadTasks();
	if(!tasks) return;
	console.log(tasks);

	//set simlength
	simLength = Number($('#simlength').val());

	
	draw(freqFixed);

	$('#rates').show();

}

function draw(fixed)
{

	const canvas = document.getElementById("canvas");
	const width = canvas.width = window.innerWidth;
	const height = canvas.height = 0.5 * window.innerHeight;
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, width, height);

	let axisPadding = 75;
	let graphWidth = width - 2*axisPadding;
	let graphHeight = height - axisPadding - height * 0.1;

	//bottom axis
	ctx.fillStyle = 'black';
	ctx.fillRect(axisPadding, height - (height * 0.1), graphWidth, height*0.01);


	let util = 0;
	let periods = [];

	//first see if a schedule is feasible by ultilization and seeing if any deadlines are before release times
	for(let i = 0; i < tasks.length; i++)
	{
		let current = tasks[i];

		//validate task within itself
		if(!current.validate())
		{
			alert('Task: ' + current.name + ' is impossible!');
			return;
		}

		util += current.execution / Math.min((current.deadline - current.release), current.period); //relative deadline
		//util += current.execution / current.period;

		periods.push(current.period);
	}

	let feasible = true;

	if(util > 1)
	{
		feasible = false;
		//still going to run through and visualize where it fails.
	}

	//https://stackoverflow.com/questions/47047682/least-common-multiple-of-an-array-values-using-euclidean-algorithm
	const gcd = (a, b) => a ? gcd(b % a, a) : b;
	const lcm = (a, b) => a * b / gcd(a, b);

	const hyperPeriod = periods.reduce(lcm);

	const spacing = 100;

	const timePerPixel = simLength / graphWidth;
	console.log(timePerPixel);

	ctx.font = "10px Tahoma";

	//frequency legend
	ctx.fillText('Fraction of FMax', 20, axisPadding - 25);

	//draw ticks on the graph
	for(let i = 0; i < graphWidth; i += spacing)
	{
		let x = i + axisPadding;

		//adjust for offset
		let value = Math.round((i * timePerPixel + Number.EPSILON) * 10) / 10

		ctx.fillRect(x, height - (height * 0.1), 2, 15);
		ctx.fillText(value, x, height - (height * 0.1) + 30);
	}

	sortTasks();

	let simTime = 0;
	let cycle = 0; // # of completed hyper periods

	let freq = 1;
	if(util < 1) freq = util;

	if(fixed)
	{
		if(util > 0.75) freq = 1;
		else if(util > 0.5) freq = 0.75;
		else freq = 0.5;
	}

	let freqTop = freq;

	while(simTime <= simLength)
	{
		if(Math.floor(simTime / hyperPeriod) > cycle) 
		{
			cycle = Math.floor(simTime / hyperPeriod); //this will be useful for fixed freq to calc utilization

			//reset freq to what it was at the beginning because its a new hyperperiod
			freq = freqTop;

			//reset each execution count because it'a a new hyperperiod
			$.each(tasks, function(task)
			{
				task.executions = 0;
			});
		}

		//grab first task in sorted array (task with next deadline)
		let cur = tasks[0];

		//task with next deadline has not released yet
		let i = 0;
		let nearestRelease = tasks[0].nextRelease;

		//break out when a task is released, or every task is checked
		while(cur.nextRelease > simTime && i < tasks.length - 1)
		{
			cur = tasks[++i];
			console.log(cur.name);
			if(cur.nextRelease < nearestRelease) nearestRelease = cur.nextRelease; //keep track of smallest release
		}

		//need to advance time
		if(cur.nextRelease > simTime)
		{
			simTime = nearestRelease;
			continue; //skip rest of loop
		}
		
		let x = (simTime / timePerPixel) + axisPadding; //divide to get pixelPerTime
		let y = axisPadding + ((1-freq) * graphHeight); //where the top of the rect should be scaled for freq


		let addTime = cur.execution / freq;

		//gonna miss the deadline
		let miss = false;
		let missTime = 0;
		if(simTime + addTime > cur.nextDeadline)
		{
			miss = true;
			missTime = cur.nextDeadline;
		}

		

		if(simTime + addTime > simLength) //gonna bleed over the edge
		{
			addTime = simLength - simTime; //make it go to the end
		}

		let sizeX = (addTime / timePerPixel);
		let sizeY = graphHeight - (1-freq) * graphHeight;

		ctx.fillStyle = cur.colour;
		ctx.fillRect(x, y, sizeX, sizeY);

		//start of execution
		ctx.font = "10px Tahoma";
		ctx.fillText(Math.round((simTime + Number.EPSILON) * 10) / 10, simTime/timePerPixel + axisPadding, y - 10);

		simTime += addTime; //update the time after the box is drawn
		cur.executions = cur.executions + 1; //increment counter of executions

		ctx.fillStyle = "#" + invertHex(cur.colour.substr(1)); //this is so it will always show up on the block
		ctx.font = "15px Tahoma";
		ctx.fillText(cur.name, (2 * x + sizeX) / 2, (2 * y + sizeY) / 2); //write name in center of the block

		ctx.font = "10px Tahoma";
		ctx.fillText(Math.round((simTime + Number.EPSILON) * 10) / 10, simTime/timePerPixel + axisPadding, y - 10);

		ctx.fillStyle = 'black';
		ctx.fillText(Math.round((freq + Number.EPSILON) * 100) / 100, axisPadding - 25, y); 

		if(miss)
		{
			ctx.fillStyle = 'red';
			ctx.fillRect(missTime / timePerPixel + axisPadding, axisPadding, 10, graphHeight);

			ctx.fillStyle = 'black';
			ctx.fillText('DEADLINE MISSED at t=' + missTime, x, axisPadding - 30);

			break;//stop because deadline was missed
		}
	

		cur.nextDeadline += cur.period;
		cur.nextRelease += cur.period;


		//update utilization
		util = 0;
		let totalExecutionTime = 0;
		let intervalStart = simTime;
		let intervalEnd = (cycle + 1) * hyperPeriod; //end of current cycle;

		if(fixed)
		{

			for(let i = 0; i < tasks.length; i++)
			{
				let task = tasks[i];
			    
			    let factor = hyperPeriod / task.period; //this is how many times the task will execute per hyperperiod

			    totalExecutionTime += (factor - task.executions) * task.execution //number of executions left * execution time
			    //debugger;
			}

			util = totalExecutionTime / (intervalEnd - intervalStart);

			if(util > 1) freq = 1; //going to fail somewhere
			else if(util == 0 || util == -0 || util < 0) freq; //don't do anything because util has a weird value
			else if(util > 0.75) freq = 1;
			else if(util > 0.5) freq = 0.75;
			else freq = 0.5;
		}
		


		sortTasks();
	}	

	//draw top axis after
	ctx.fillStyle = 'black';
	ctx.fillRect(axisPadding, axisPadding, height*0.01, height - (height * 0.1) - axisPadding);

}

function sortTasks()
{
	//sort first by deadline, then execution
	tasks.sort( (x, y) => 
	{
		if(x.nextDeadline != y.nextDeadline) return x.nextDeadline - y.nextDeadline;
		else return x.execution - y.execution;
	});
}

//https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
function invertHex(hex) {
  return (Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()
}

