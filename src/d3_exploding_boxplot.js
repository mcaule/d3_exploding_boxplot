(function(factory){
	if(typeof define === "function"  && define.amd)
	{
		define(['d3','d3-tip'],factory)
	}else{
		if(d3 && d3.tip)
			d3.exploding_boxplot = factory(d3,d3.tip)
		else
			d3.exploding_boxplot = factory(d3)
	}
}(
function(d3,d3tip)
{

  var default_colors = ["#a6cee3","#ff7f00","#b2df8a","#1f78b4","#fdbf6f","#33a02c","#cab2d6","#6a3d9a","#fb9a99","#e31a1c","#ffff99","#b15928"];
  var compute_boxplot = function(data,iqr_k,value){
    iqr_k = iqr_k || 1.5
    value = value || Number

    var seriev = data.map(functorkey(value)).sort(d3.ascending)

    var quartiles = [
      d3.quantile(seriev,0.25),
      d3.quantile(seriev,0.5),
      d3.quantile(seriev,0.75)
    ]

    var iqr = (quartiles[2]-quartiles[0])*iqr_k

    //group by outlier or not
		var max = Number.MIN_VALUE
		var min = Number.MAX_VALUE
    var box_data = d3.nest()
                .key(function(d){
                  d=functorkey(value)(d)
                  var type = (d<quartiles[0]-iqr || d>quartiles[2]+iqr)? 'outlier' : 'normal';
									if(type=='normal' && (d<min || d>max)){
										max = Math.max(max,d)
										min = Math.min(min,d)
									}
									return type
                })
                .map(data)

		if(!box_data.outlier)
			box_data.outlier = []
    box_data.quartiles = quartiles
    box_data.iqr = iqr
		box_data.max = max
		box_data.min = min


    return box_data
  }

  var exploding_boxplot = function(data,aes)
  {
    //defaults
    var iqr = 1.5
    var height = 480
    var width = 600
    var boxpadding = 0.2
    var margin = {top:10,bottom:30,left:40,right:10}
		var rotateXLabels = false;

    aes.color = aes.color || aes.group
    aes.radius = aes.radius || d3.functor(3)
		aes.label = aes.label || d3.functor('aes.label undefined')

    var ylab = typeof aes.y === "string" ? aes.y : ""
    var xlab = typeof aes.group === "string" ? aes.group : ""

    var yscale = d3.scale.linear()
                      .domain(d3.extent(data.map(functorkey(aes.y))))
											.nice()
                      .range([height-margin.top-margin.bottom,0]);


    var groups
    if(aes.group){
      groups = d3.nest()
                .key(functorkey(aes.group))
                .entries(data)
    }else{
      groups = [{key:'',values:data}]
    }


    var xscale = d3.scale.ordinal()
                  .domain(groups.map(function(d){return d.key}))
									.rangeRoundBands([0,width-margin.left-margin.right],boxpadding)


    var colorscale = d3.scale.ordinal()
            .domain(d3.set(data.map(functorkey(aes.color))).values())
            .range(default_colors)

    //create boxplot data
    groups = groups.map(function(g){
      var o = compute_boxplot(g.values,iqr,aes.y)
      o['group'] = g.key
      return o
    })



		var tickFormat = function(n){return n.toLocaleString()}

		//default tool tip function
		var _tipFunction = function(d) {
				return ' <span style="color:'+colorscale(functorkey(aes.color)(d))+'">'+
						functorkey(aes.label)(d)+'</span><span style="color:#DDDDDD;" > : '+ tickFormat(functorkey(aes.y)(d)) + '</span>';
			}


    var svg,container,tip
    var chart = function(elem)
    {
      svg = d3.select(elem).append('svg')
            .attr('width',width)
            .attr('height',height)

			svg.append('g').append('rect')
					.attr('width',width)
					.attr('height',height)
					.style('color','white')
					.style('opacity',0)
					.on('dblclick',implode_boxplot)


      container = svg.append('g')
                          .attr('transform','translate('+margin.left+','+margin.top+')')


      var xAxis = d3.svg.axis().scale(xscale).orient('bottom')
      var yAxis = d3.svg.axis().scale(yscale).orient('left').tickFormat(tickFormat)



      var xaxisG = container.append('g')
            .attr('class','d3-exploding-boxplot x axis')
            .attr("transform", "translate(0,"+ (height-margin.top-margin.bottom) +")")
            .call(xAxis);

			if(rotateXLabels){
				xaxisG.selectAll('text')
				    .attr("transform", "rotate(90)")
						.attr("dy",".35em")
						.attr("x","9").attr("y","0")
				    .style("text-anchor", "start");
			}

			xaxisG.append("text")
            .attr("x",(width-margin.left-margin.right)/2)
            .attr("dy", ".71em")
            .attr('y',margin.bottom-14)
            .style("text-anchor", "middle")
            .text(xlab);

      container.append('g')
            .attr('class','d3-exploding-boxplot y axis')
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -margin.top-d3.mean(yscale.range()))
            .attr("dy", ".71em")
            .attr('y',-margin.left+5)
            .style("text-anchor", "middle")
            .text(ylab);

			container = container.insert('g','.axis')

      draw()
    };
		var create_jitter = function(g,i) {
 			d3.select(this).append('g')
					.attr('class','d3-exploding-boxplot outliers-points')
 					.selectAll('.point')
 					.data(g.outlier)
 					.enter()
 						.append('circle')
						.call(init_jitter)
						.call(draw_jitter)
			d3.select(this).append('g')
					.attr('class','d3-exploding-boxplot normal-points')
		};

		var init_jitter = function(s){
			s.attr('class','d3-exploding-boxplot point')
				.attr('r',functorkey(aes.radius))
				.attr('fill',function(d){
					return colorscale(functorkey(aes.color)(d))
				})
				.call(function(s){
					if(!s.empty())
						tip(s)
				})
				.on('mouseover',tip.show)
				.on('mouseout',tip.hide)
		}
		var draw_jitter = function(s){
			s.attr('cx',function(d){
				var w = xscale.rangeBand()
				return Math.floor(Math.random() * w)
			})
			.attr('cy',function(d){
				return yscale((functorkey(aes.y))(d))
			})
		}

		var create_boxplot = function(g,i) {
			var s = d3.select(this).append('g')
				.attr('class','d3-exploding-boxplot box')
				.on('click',function(d){
					explode_boxplot(this.parentNode,g)
				})
				.selectAll('.box')
				.data([g])
				.enter()
			//box
			s.append('rect')
						.attr('class','d3-exploding-boxplot box')
						.attr('fill',function(d){
							return colorscale(functorkey(aes.color)(d.normal[0]))
						})
			//median line
			s.append('line').attr('class','d3-exploding-boxplot median line')
			//min line
			s.append('line').attr('class','d3-exploding-boxplot min line hline')
			//min vline
			s.append('line').attr('class','d3-exploding-boxplot line min vline')
			//max line
			s.append('line').attr('class','d3-exploding-boxplot max line hline')
			//max vline
			s.append('line').attr('class','d3-exploding-boxplot line max vline')
		};
		var draw_boxplot = function(s){
			//box
			s.select('rect.box')
						.attr('x',0)
						.attr('width',xscale.rangeBand())
						.attr('y',function(d){return yscale(d.quartiles[2])})
						.attr('height',function(d){
							return yscale(d.quartiles[0])-yscale(d.quartiles[2])
						})
			//median line
			s.select('line.median')
						.attr('x1',0).attr('x2',xscale.rangeBand())
						.attr('y1',function(d){return yscale(d.quartiles[1])})
						.attr('y2',function(d){return yscale(d.quartiles[1])})
			//min line
			s.select('line.min.hline')
						.attr('x1',xscale.rangeBand()*0.25)
						.attr('x2',xscale.rangeBand()*0.75)
						.attr('y1',function(d){return yscale(Math.min(d.min,d.quartiles[0]))})
						.attr('y2',function(d){return yscale(Math.min(d.min,d.quartiles[0]))})
			//min vline
			s.select('line.min.vline')
						.attr('x1',xscale.rangeBand()*0.5)
						.attr('x2',xscale.rangeBand()*0.5)
						.attr('y1',function(d){return yscale(Math.min(d.min,d.quartiles[0]))})
						.attr('y2',function(d){return yscale(d.quartiles[0])})
			//max line
			s.select('line.max.hline')
						.attr('x1',xscale.rangeBand()*0.25)
						.attr('x2',xscale.rangeBand()*0.75)
						.attr('y1',function(d){return yscale(Math.max(d.max,d.quartiles[2]))})
						.attr('y2',function(d){return yscale(Math.max(d.max,d.quartiles[2]))})
			//max vline
			s.select('line.max.vline')
						.attr('x1',xscale.rangeBand()*0.5)
						.attr('x2',xscale.rangeBand()*0.5)
						.attr('y1',function(d){return yscale(d.quartiles[2])})
						.attr('y2',function(d){return yscale(Math.max(d.max,d.quartiles[2]))})
		};
		var hide_boxplot =  function(g,i)
		{
			var s = this
			s.select('rect.box')
						.attr('x',xscale.rangeBand()*0.5)
						.attr('width',0)
						.attr('y',function(d){return yscale(d.quartiles[1])})
						.attr('height',0)
			//median line
			s.selectAll('line')
						.attr('x1',xscale.rangeBand()*0.5)
						.attr('x2',xscale.rangeBand()*0.5)
						.attr('y1',function(d){return yscale(d.quartiles[1])})
						.attr('y2',function(d){return yscale(d.quartiles[1])})
		};
		var explode_boxplot = function(elem,g){
			d3.select(elem).select('g.box').transition()
					.ease(d3.ease('back-in'))
					.duration(300)
					.call(hide_boxplot)
			d3.select(elem).selectAll('.normal-points')
 					.selectAll('.point')
 					.data(g.normal)
 					.enter()
 						.append('circle')
						.attr('cx',xscale.rangeBand()*0.5)
						.attr('cy',yscale(g.quartiles[1]))
						.call(init_jitter)
						.transition()
						.ease(d3.ease('back-out'))
						.delay(function(){
							return 300+100*Math.random()
						})
						.duration(function(){
							return 300+300*Math.random()
						})
						.call(draw_jitter)
		};
		var implode_boxplot = function(elem,g){
			container.selectAll('.normal-points')
						.each(function(g){
							d3.select(this)
								.selectAll('circle')
								.transition()
								.ease(d3.ease('back-out'))
								.duration(function(){
									return 300+300*Math.random()
								})
								.attr('cx',xscale.rangeBand()*0.5)
								.attr('cy',yscale(g.quartiles[1]))
								.remove()
						})


			container.selectAll('.boxcontent')
					.transition()
					.ease(d3.ease('back-out'))
					.duration(300)
					.delay(200)
          .call(draw_boxplot)
		}
		var create_tip = function(){
			tip = d3tip().attr('class','d3-exploding-boxplot tip')
						.direction('n')
						.html(_tipFunction)
			return tip
		};

    function draw()
    {
			tip = tip || create_tip();
			chart.tip = tip
      var boxContent = container.selectAll('.boxcontent')
          .data(groups)
          .enter().append('g')
          .attr('class','d3-exploding-boxplot boxcontent')
          .attr('transform',function(d){
            return 'translate('+xscale(d.group)+',0)'
          })
          .each(create_jitter)
					.each(create_boxplot)
					.call(draw_boxplot)

    };

    chart.iqr = function(_) {
      if (!arguments.length) return iqr;
      iqr = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      xscale.rangeRoundBands([0,width-margin.left-margin.right],boxpadding)
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      yscale.range([height-margin.top-margin.bottom,0])
      return chart;
    };

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      //update scales
      xscale.rangeRoundBands([0,width-margin.left-margin.right],boxpadding)
      yscale.range([height-margin.top-margin.bottom,0])
      return chart;
    };

    chart.xlab = function(_) {
      if (!arguments.length) return xlab;
      xlab = _;
      return chart;
    };
    chart.ylab = function(_) {
      if (!arguments.length) return ylab;
      ylab = _;
      return chart;
    };
		chart.ylimit = function(_){
			if (!arguments.length) return yscale.domain();
			yscale.domain(_.sort(d3.ascending))
			return chart
		};
		chart.yscale = function(_){
			if (!arguments.length) return yscale;
			yscale = _
			return chart
		};
		chart.xscale = function(_){
			if (!arguments.length) return xscale;
			xscale = _
			return chart
		};
		chart.tickFormat = function(_){
			if (!arguments.length) return tickFormat;
			tickFormat = _
			return chart
		};
    chart.colors = function(_) {
      if (!arguments.length) return colorscale.range();
      colorscale.range(_)
      return chart;
    };
		chart.rotateXLabels = function(_) {
			if (!arguments.length) return rotateXLabels;
      rotateXLabels = _
      return chart;
		}


    return chart;

  }

  function functorkey(v)
  {
    return typeof v === "function" ? v : function(d) { return d[v]; };
  }


  //i want arrows function...
  function fk(v){
    return function(d){return d[v]};
  }

  exploding_boxplot.compute_boxplot = compute_boxplot

  return exploding_boxplot;
}

));
