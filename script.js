class Task
{
	constructor(name, release, execution, period, deadline, colour)
	{
		this.name = name;
		this.release = release;
		this.execution = execution;
		this.period = period;
		this.deadline = deadline;
		this.colour = colour;
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

	$('#in').append(`<tr class="taskInput"><td><input type="text" value="T` + ++taskCount + `"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="number"></td>
                    <td><input type="text" value="#` + randomColor + `" style="background-color: #` + randomColor + `"></td></tr>`);
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
		$('input', this).each(function()
		{
			if($(this).val() == '')
			{
				valid = false;
				return false;
			}

			vals.push($(this).val());
		});

		if(vals.length !== 6)
		{
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


function generate()
{

	tasks = loadTasks();
	if(!tasks) return;
	console.log(tasks);

	//set simlength
	simLength = Number($('#simlength').val());

	//start not fixed
	draw(false);
}

//make this global
let simLength;

function draw(fixed)
{

	const canvas = document.getElementById("canvas");
	const width = canvas.width = window.innerWidth;
	const height = canvas.height = 0.5 * window.innerHeight;
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "lightgrey";
	ctx.fillRect(0, 0, width, height);


	ctx.fillStyle = 'black';
	ctx.fillRect(0, height - (height * 0.1), width, height*0.01);

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

		util += current.execution / (current.deadline - current.release); //relative deadline

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
	//only have to run for one hyperperiod and then can just copy that over and over again

	let spacing = 100;

	let tickSize = simLength / (width / spacing); //how much time each tick will represent
	console.log(tickSize)
;
	ctx.font = "10px Tahoma";
	for(let i = 0; i < width; i += spacing)
	{
		let value = Math.round((i / simLength + Number.EPSILON) * 10) / 10

		ctx.fillRect(i, height - (height * 0.1), 2, 15);
		ctx.fillText(value, i, height - (height * 0.1) + 30);
	}

}
