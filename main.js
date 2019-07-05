

// Run this script with nodejs,
// You'll also need to run:

// $ npm install gnuplot

// For this example let's use SI Units

var gnuplot = require('gnuplot')

const all_material_specs = 
{
	"2024 T351-AL":
	{
		"0.2% Yield Strength": 379,               // s0
		"Ultimate Tensile Strength": 455,         // su
		"Elastic Modulus": 73100,                 // E
		"Cyclic Strength Coefficient": 662,       // H'
		"Cyclic Strain Hardening Exponent": 0.07, // n'
		"Fatigue Strength Coefficient": 927,      // sf'
		"Fatigue Strain Exponent": -0.113,        // b
		"Walker's Exponent": 0.5,                 // y
		"Fatigue Ductility Coefficient": 0.409,   // ef'
		"Fatigue Ductility Exponent": -0.713      // c
	},
	"SAE1015":
	{
		"0.2% Yield Strength": 228,                // s0
		"Ultimate Tensile Strength": 415,          // su
		"Elastic Modulus": 207000,                 // E
		"Cyclic Strength Coefficient": 1349,       // H'
		"Cyclic Strain Hardening Exponent": 0.282, // n'
		"Fatigue Strength Coefficient": 1020,      // sf'
		"Fatigue Strain Exponent": -0.138,         // b
		"Walker's Exponent": 0.735,                // y
		"Fatigue Ductility Coefficient": 0.439,    // ef'
		"Fatigue Ductility Exponent": -0.513       // c
	},
	"Ti-AI-4V":
	{
		"0.2% Yield Strength": 1185,               // s0
		"Ultimate Tensile Strength": 1233,         // su
		"Elastic Modulus": 117000,                 // E
		"Cyclic Strength Coefficient": 1772,       // H'
		"Cyclic Strain Hardening Exponent": 0.106, // n'
		"Fatigue Strength Coefficient": 2030,      // sf'
		"Fatigue Strain Exponent": -0.104,         // b
		"Walker's Exponent": 0.5,                  // y
		"Fatigue Ductility Coefficient": 0.841,    // ef'
		"Fatigue Ductility Exponent": -0.688       // c
	},
	"AISI4340 Aircraft":
	{
		"0.2% Yield Strength": 1103,               // s0
		"Ultimate Tensile Strength": 1172,         // su
		"Elastic Modulus": 207000,                 // E
		"Cyclic Strength Coefficient": 1655,       // H'
		"Cyclic Strain Hardening Exponent": 0.131, // n'
		"Fatigue Strength Coefficient": 1758,      // sf'
		"Fatigue Strain Exponent": -0.0977,        // b
		"Walker's Exponent": 0.65,                 // y
		"Fatigue Ductility Coefficient": 2.12,     // ef'
		"Fatigue Ductility Exponent": -0.774       // c
	},
	"AISI 4340 (409 HB)":
	{
		"0.2% Yield Strength": 228,                // s0
		"Ultimate Tensile Strength": 415,          // su
		"Elastic Modulus": 207000,                 // E
		"Cyclic Strength Coefficient": 1349,       // H'
		"Cyclic Strain Hardening Exponent": 0.282, // n'
		"Fatigue Strength Coefficient": 1020,      // sf'
		"Fatigue Strain Exponent": -0.138,         // b
		"Walker's Exponent": 0.735,                // y
		"Fatigue Ductility Coefficient": 0.439,    // ef'
		"Fatigue Ductility Exponent": -0.513       // c
	},
};

// Select Material:

const material_specs = all_material_specs["SAE1015"];

// Specimen Selection:

//const shape = "smooth_specimen";
const shape = "notched_specimen";
const kt = 2.0; // this value only applies to notched specimens
		
function stress_strain_curve_given_S(s, curve_type = 1)
{
	var sign = Math.sign(s);
	s *= sign;
	var ret = 100 * sign * 
	(
		(s / material_specs["Elastic Modulus"])
		+
		curve_type * Math.pow
		(
			s / (curve_type * material_specs["Cyclic Strength Coefficient"]),
			1 / material_specs["Cyclic Strain Hardening Exponent"]
		)
	);
	return ret;
}

if(shape == "smooth_specimen")
{
	// var kt = 1.0; // always for smooth specimen
	var dataset = [];
	var stopping_point = material_specs["Ultimate Tensile Strength"];
	for(var sn = 0;sn <= stopping_point;sn++)
	{
		dataset.push({
			// cyclic curve
			"x": stress_strain_curve_given_S(sn),
			"y": sn
		});
	}
	gnuplot()
		.set('term png')
		.set('output "specimen.png"')
		.set('xlabel "Strain Amplitude"')
		.set('ylabel "Stress Amplitude"')
		.set('autoscale xy')
		.set('zeroaxis')
		.println("$data << EOD")
		.println((dataset.map(ele => ele.x + " " + ele.y)).join("\n"))
		.println("EOD")
		.plot('"$data" with lines title "Cyclic R-O"')
		.end();
}
else // if(shape == "notched_specimen")
{
	function neuber_given_sn(sn) {
		var signPre = Math.sign(sn);
		sn *= signPre;
		if(sn == 0)
		{
			return 0;
		}
		var guessS = 0;
		var left = Number.MAX_VALUE;
		var right = 0;
		var sign = 0;
		var factor = 100;
		// guessing algorithm
		while (Math.abs(left - right) > 0.0000001)
		{
			if (left > right)
			{
				if (sign < 0)
				{
					factor /= 10;
				}
				guessS += factor;
				sign = 1;
			}
			else
			{
				if(sign < 0)
				{
					factor /= 10;
				}
				guessS -= factor;
				sign = -1;
			}
			// replugs in guess to compare with actual
			left =
				Math.pow(sn * kt, 2)
				/ material_specs["Elastic Modulus"]
				/ guessS;
			right = stress_strain_curve_given_S(guessS) / 100;
		}
		return guessS * signPre;
	}
	
	var standard = [], neuber = [];
	var stopping_point = material_specs["Ultimate Tensile Strength"];
	for(var sn = 0;sn <= stopping_point;sn++)
	{
		var s = neuber_given_sn(sn);
		var x = stress_strain_curve_given_S(s);
		standard.push({
			"x": x,
			"y": s
		});
		neuber.push({
			"x": x,
			"y": sn * kt
		});
	}
	gnuplot()
		.set('term png')
		.set('output "specimen.png"')
		.set('xlabel "Strain"')
		.set('ylabel "Stress"')
		.set('autoscale xy')
		.set('zeroaxis')
		.println("$standard << EOD")
		.println((standard.map(ele => ele.x + " " + ele.y)).join("\n"))
		.println("EOD")
		.println("$neuber << EOD")
		.println((neuber.map(ele => ele.x + " " + ele.y)).join("\n"))
		.println("EOD")
		.plot(
			'"$standard" with lines title "Cyclic R-O"' + ', ' +
			'"$neuber" with lines title "Neuber curve"'
		)
		.end();
}


// Loading Type:

const loading_type = "Constant Amplitude Loading";
const cal_input = "Stress", cal_first_peak = 200, cal_second_peak = -300;

//const loading_type = "Block Loading";
//const loading_type = "Spectrum Loading";

const scaling_factor = 1.0;

{
	var levels;
	if(loading_type == "Constant Amplitude Loading")
	{
		if(cal_input == "Stress")
		{
			levels =
			[
				cal_first_peak * scaling_factor,
				cal_second_peak * scaling_factor
			];
			levels = levels.concat(levels, levels,
				levels, levels,
				cal_first_peak * scaling_factor);
		}
		else // if(cal_input == "Strain")
		{
			console.log("TODO");
		}
	}
	else if(loading_type == "Block Loading")
	{
		console.log("TODO");
	}
	else // if(loading_type == "Spectrum Loading")
	{
		console.log("TODO");
	}
	
	// loading graph
	{
		var dataset = [{"x": 0, "y": 0}];
		for(var i = 0;i < levels.length;i++)
		{
			dataset.push({
				"x": i + 1,
				"y": levels[i]
			});
		}
		
		gnuplot()
			.set('term png')
			.set('output "loadingtype.png"')
			.set('ylabel "Stress"')
			.set('autoscale xy')
			.set('zeroaxis')
			.println("$data << EOD")
			.println((dataset.map(ele => ele.x + " " + ele.y)).join("\n"))
			.println("EOD")
			.plot('"$data" with lines title "Loading"')
			.end();
	}
	
	// hystersis graph
	{
		var list = [];
		{
			var maxVal = 0;
			var passed = false;
			var dir = Math.sign(levels[0] - levels[1]);
			var coordinates = [];
			var previousVal = 0;
			var newValueTop = 0;
			var cycleList = [];
			
			for (var i = 0;i < levels.length; i++)
			{
				var level = levels[i];
				var current = levels[i];
				var over = false;
				
				if (Math.abs(level) >= maxVal) {
					current = dir * maxVal;
					over = true;
				}
				
				if(i != 0)
				{
					var position = 0;
					var delta = Math.abs(current - levels[i - 1]);
					
					while(
						coordinates.length > 1
						&&
						delta + position >=
							coordinates[coordinates.length - 1].delta
					)
					{
						for(
							var s = position;
							s <= coordinates[coordinates.length - 1].delta;
							s++)
						{
							list.push({
								"x": coordinates[coordinates.length - 1].x +
									stress_strain_curve_given_S(dir * s, 2),
								"y": coordinates[coordinates.length - 1].y +
									dir * s
							});
						}
						delta += position -
							coordinates[coordinates.length - 1].delta;
						position = coordinates[coordinates.length-2].delta;
						coordinates.pop();
						coordinates.pop();
						for(var highest = 1;highest < levels.length;highest++)
						{
							if(level == levels[highest])
							{
								break;
							}
						}
						previousVal = levels[highest - 1];
						newValueTop = levels[highest];
						var tuple =
						{
							firstValue: previousVal,
							secondValue: newValueTop
						};
						var alreadyPresent = false;
						if(cycleList != [])
						{
							for(
								var inside = 0;
								inside < cycleList.length;
								inside++)
							{
								if(
									previousVal == cycleList[inside].firstValue
									&&
									newValueTop == cycleList[inside].secondValue
								)
								{
									alreadyPresent = true;
								}
							}
						}
						else
						{
							alreadyPresent = false;
						}
						if(!alreadyPresent)
						{
							cycleList.push(tuple);
						}
					}
					if(coordinates.length > 0)
					{
						for(var s = position;s <= delta + position;s++)
						{
							list.push({
								"x": coordinates[coordinates.length-1].x
									+ stress_strain_curve_given_S(dir * s, 2),
								"y": coordinates[coordinates.length-1].y
									+ dir*s
							})
						}
						coordinates.push({
							"x": coordinates[coordinates.length-1].x
								+ stress_strain_curve_given_S(
									dir * (delta + position), 2),
							"y": coordinates[coordinates.length-1].y
								+ dir * (delta + position),
							delta:delta+position
						})
					}
				}
				// if the input is > max previous input
				if(over)
				{
					for(var s = Math.abs(current);s <= Math.abs(level);s++)
					{
						list.push({
							"x": stress_strain_curve_given_S(s * dir, 1),
							"y": s * dir
						});
					}
					coordinates = [];
					coordinates.push({
						x: stress_strain_curve_given_S(level, 1),
						y: level,
						delta:Number.MAX_VALUE
					});
					maxVal = Math.abs(level);
				}
				dir *= -1;
			}
		}
		
		gnuplot()
			.set('term png')
			.set('title "Hystersis"')
			.set('output "hystersis.png"')
			.set('xlabel "Strain"')
			.set('ylabel "Stress"')
			.set('autoscale xy')
			.set('zeroaxis')
			.println("$data << EOD")
			.println((list.map(ele => ele.x + " " + ele.y)).join("\n"))
			.println("EOD")
			.plot('"$data" with lines title "Loading"')
			.end();
	}
	
}


// Life Calculation:
{
	// Stress:
	{
		if(loading_type == "Constant Amplitude Loading")
		{
			console.log("TODO");
		}
		else if(loading_type == "Block Loading")
		{
			console.log("TODO");
		}
		else // if(loading_type == "Spectrum Loading")
		{
			console.log("TODO");
		}
	}
	
	// Strain-Marrow:
	{
		
	}
	
	// SWT:
	{
		
	}
}






























