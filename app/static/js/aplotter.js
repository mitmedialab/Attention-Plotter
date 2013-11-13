/*!
 * Attention Plotter Javascript
 * https://github.com/erhardt/Attention-Plotter
 */

AttentionPlotter = {
  // Dimensions of the graph
  graphwidth: 2000,
  graphheight: 400,
  eventheight: 100,

  // d3 params and helper functions
  margin: {
    top: 20,
    right: 0,
    bottom: 50,
    left: 0
  },
  x0padding: 0.1,

  timestampToDate: function (d) {
    date = new Date(d * 1000);
    var y = date.getUTCFullYear();
    var m = date.getUTCMonth() + 1;
    var mday = date.getUTCDate();
    return m + '/' + mday;
  },
  
  // Set up graph on page load
  createGraph: function (data, events) {
    that = this;
    this.width = this.graphwidth - this.margin.left - this.margin.right;
    this.height = this.graphheight - this.margin.top - this.margin.bottom;
    // d3 scales and axes
    this.x0 = d3.scale.ordinal().rangeRoundBands([0, this.width], that.x0padding, 0);
    this.x1 = d3.scale.ordinal();
    this.y = d3.scale.linear().rangeRound([this.height, 0]);
    this.color = d3.scale.category10();
    this.xAxis = d3.svg.axis().scale(this.x0).orient('bottom');
    this.line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) { return that.x0(d.date)-that.x0offset+Math.floor(that.x0.rangeBand()/2); }) // uses color index to capture # of media types
        .y(function(d) { return that.y(d.value); });
    this.svg = d3.select('#vis').append('svg')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.eventheight + this.margin.top + this.margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
    this.svgBg = this.svg.append('g').attr('class', 'bg');
    this.svg.append('g')
      .attr('class', 'events')
      .attr('transform', 'translate(0,' + this.height + ')');
    // Plot the initial data
    this.plotData(data);
    this.plotEvents(events);
    this.wordClouds(data);
  },
  
  // d3 MAIN FUNCTION (starts by reading data from the mediacsv file)
  plotData: function(mediaS, events) {
    that = this;
  
    // get layer names
    var mediaH = mediaS.map(function (d) { return d.name; });
    
    // get dates
    var dates = mediaS[0].values.map(function (d) { return d.date; });
    
    // Organize data by date
    var dataByDate = [];
    jQuery.each(dates, function (i, d) {
      elt = {
        'date': d
        , 'media': mediaS.map(function (d) { return {'name':d.name, 'value':d.values[i]}; })
      }
      dataByDate.push(elt);
    });
    window.dataByDate = dataByDate;
    
    // creates data map for sparklines
    this.color.domain(mediaH);
  
    // sets x- and y-axis dimensions
    that.x0.domain(dates.map(that.timestampToDate));
    that.x0offset = this.x0(that.timestampToDate(dates[0]));
    that.x1.domain(mediaH).rangeRoundBands([0, that.x0.rangeBand()]);
    var layerMax = function(layer) {
      return d3.max(layer.values, function(d) { return d.value; });
    }
    this.y.domain([0, d3.max(mediaS, layerMax)]);
  
    // creates x-axis
    this.svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + (-that.x0offset) + ',' + this.height + ')')
        .call(this.xAxis);
    d3.selectAll('.x.axis .tick line')
      .attr('stroke', 'black');
    d3.selectAll('.x.axis path').remove();
  
    // rotates x-axis labels
    this.svg.selectAll('.x.axis text')  // select all the text elements for the x-axis
        .attr('style', 'text-anchor: end;')
        .attr('transform', function(d) {
            //return 'translate(' + this.getBBox().height*-0.5 + ',' + this.getBBox().height*0.5 + ')rotate(-45)'; // angled
            return 'translate(' + this.getBBox().height*-1.1 + ',' + this.getBBox().height*0.9 + ')rotate(-90)'; // vertical
        });
        
    // Add custom class to x axis labels
    $('.x.axis .tick.major').each(function (i, d) {
      d3.select(d).classed('date-' + dates[i], true);
    });
    // Adjust label positions
    d3.selectAll('.x.axis .tick text').attr('dy', '1em')
  
    // instantiates media.csv data
    var mediumH = this.svg.selectAll('.date')
        .data(dataByDate)
      .enter().append('g')   // create svg group (g) for every date
        .attr('class', 'g date')
        .attr('id', function(d) { return 'graph-dategroup-' + d['date']; })
        .attr('transform', function(d) { return 'translate(' + (that.x0(d.date) - that.x0offset) + ',0)'; });
    
    // generates x axis 'platforms' for bars over each date
    mediumH.selectAll('line.platform')
        .data(mediaH)
      .enter().append('line')
        .attr('class','platform')
        .attr('stroke-width', '1')
        .attr('stroke', 'black')
        .attr('x1', function (d) { return that.x1(d); })
        .attr('y1', this.height + 0.5)
        .attr('x2', function (d) { return that.x1(d) + that.x1.rangeBand(); })
        .attr('y2', this.height + 0.5);
  
    // Create count label and reference line
    countShadow = this.svg.append('text').text('0')
      .attr('fill', 'white')
      .attr('stroke', 'white')
      .attr('stroke-width', '2')
      .attr('font-weight', 'bold')
      .attr('opacity', '0');
    countLabel = this.svg.append('text').text('0')
      .attr('opacity', '0');
    countLine = this.svgBg.append('line')
      .attr('stroke', '#d7d7d7')
      .attr('x1', 0).attr('x2', that.width - 2*that.x0offset)
      .attr('y1', 0).attr('y2', 0)
      .attr('opacity', 0);
        
    // creates bars
    var bars = mediumH.selectAll('rect')
        .data(function(d) { return d.media; });
    bars
      .enter().append('rect')
        .attr('class', function(d) { return 'active bar' + mediaH.indexOf(d.name); }) // index on array
        .style('fill', function(d) { return that.color(d.name); })
        .attr('width', that.x1.rangeBand())
        .attr('x', function(d) { return that.x1(d.name); })
        .attr('y', function(d) { return that.y(d.value.value) - 1; })
        .attr('height', function(d) { return that.height - that.y(d.value.value); });
    bars
      .on('mouseover', function (d) {
        if (d3.select(this).classed('active')) {
          d3.select(this).attr('opacity', 0.75);
          countShadow.text(d.value.raw);
          countLabel.text(d.value.raw);
          var lx = that.x0(that.timestampToDate(d.value.date)) - that.x0offset + that.x1(d.name);
          var ly = that.y(d.value.value) - 0.5;
          countLine.attr('y1', ly).attr('y2', ly);
          countLine.attr('opacity', 1);
          ly = ly - 5;
          countShadow.attr('x', lx).attr('y', ly).attr('opacity', 1)
          countLabel.attr('x', lx).attr('y', ly).attr('opacity', 1);
        }
      })
      .on('mouseout', function (d) {
        if (d3.select(this).classed('active')) {
          d3.select(this).attr('opacity', 1);
          countLine.attr('opacity', 0);
          countShadow.attr('opacity', 0);
          countLabel.attr('opacity', 0);
        }
      })
  
    // creates legend
    var legend = d3.select('#legend');
    var legenditem = legend.selectAll('.item')
        .data(mediaH.slice())
      .enter().append('span')
        .style('display', 'inline-block')
        .attr('class', 'item');
  
    legenditem.append('div')
        .attr('class', function(d) { return 'legend-item lbox' + mediaH.indexOf(d) + ' active'; } ) // index on array
        .style('width', '20px')
        .style('height', '20px')
        .style('display', 'inline-block')
        .style('vertical-align', 'bottom')
        .style('background', that.color)
        .on('click',function(d) {
          var classnum = mediaH.indexOf(d);
          if(d3.select('#legend div.lbox'+classnum).classed('active')) {
            d3.selectAll('#vis rect.bar'+classnum).transition(100).attr('opacity',0.15).style('fill', '#000');
            d3.selectAll('#vis path.line'+classnum).transition(100).attr('opacity',0.15).style('stroke', '#000');
            d3.select(this).transition(100).style('opacity',0.15).style('background', '#000');
            d3.select('#legend div.lbox'+classnum).classed('active', false);
            d3.selectAll('rect.bar'+classnum).classed('active', false);
          } else {
            d3.selectAll('#vis rect.bar'+classnum).transition(100).attr('opacity',1).style('fill', color(d));
            d3.selectAll('#vis path.line'+classnum).transition(100).attr('opacity',1).style('stroke', color(d));
            d3.select(this).transition(100).style('opacity',1).style('background', color(d));
            d3.select('#legend div.lbox'+classnum).classed('active', true);
            d3.selectAll('rect.bar'+classnum).classed('active', true);
          }
        });
    
    legenditem.append('span')
        .attr('class', function(d) { return 'legend-label ltext' + mediaH.indexOf(d); } ) // index on array
        .style('margin-right', '15px')
        .text(function(d) { return ' ' + d; });
  
    // creates sparklines
    var mediumS = that.svg.selectAll('.mediumS')
        .data(mediaS)
      .enter().append('g')
        .attr('class', 'mediumS');
  
    mediumS.append('path')
        .attr('class', function(d) { return 'line line' + that.color.domain().indexOf(d.name); }) // use color as an index
        .attr('d', function(d) { return that.line(d.values); })
        .attr('fill', 'none')
        .attr('stroke', function(d) { return that.color(d.name); });
        
    that.showBars();
  },
  
  // Plot event markers
  plotEvents: function (eventData) {
    var that = this;
    // Plot the events
    events = d3.select('.events');
    event = events.selectAll('.event').data(eventData)
      .enter().append('g')
        .attr('class', function (d) { return 'event ' + 'event-' + d.timestamp; })
        .attr('transform', function (d) {
          var dx = that.x0(that.timestampToDate(d.timestamp)) - 26.5;
          var dy = 15 + that.dateLabelHeight(d.timestamp)
          return 'translate(' + dx + ',' + dy + ')';
        });
    event
      .append('line')
        .attr('x1', Math.round(that.x0.rangeBand()/2.0))
        .attr('x2', Math.round(that.x0.rangeBand()/2.0))
        .attr('y1', 10).attr('y2', 20)
        .attr('stroke', 'black');
    event
      .append('circle')
        .attr('cx', Math.round(that.x0.rangeBand()/2.0))
        .attr('cy', 10)
        .attr('r', 3)
        .attr('stroke', 'black')
        .attr('fill', 'white')
    event
      .append('g')
        .attr('transform', function (d) {
          dx = Math.round(that.x0.rangeBand()/2.0);
          return 'translate(' + dx + ',25)rotate(30)';
        })
        .append('text').text(function (d) { return d.label; })
        .attr('dx', '0').attr('dy', '0.75em');
  },
  
  // Helper to get height of date label
  dateLabelHeight: function (timestamp) {
    var t = d3.select('g.date-' + timestamp + ' text');
    console.log(t[0][0].getBBox());
    return t[0][0].getBBox().width;
  },
  
  // Show spark lines and hide bar graph
  showSparks: function () {
    $(this).attr('class','btn active');
    $('#barbutton').attr('class','btn');
    $('#vis rect').hide();
    $('#vis .platform').hide();
    $('path.line').show();
  },
  
  // Show bar graph and hide spark lines
  showBars: function() {
    $(this).attr('class','btn active');
    $('#linebutton').attr('class','btn');
    $('path.line').hide();
    $('#vis .platform').show();
    $('#vis rect').show();
  },

  // Adds functionality to switch between graph types using radio buttons
  buttonSwitcher: function() {
    $('.btn-group').find('button').bind('click',function(event){
      if($(this).attr('id')==='linebutton'){
        if($(this).attr('class')!=='btn active'){
          that.showSparks();
        }
      } else {
        if($(this).attr('class')!=='btn active'){
          that.showBars();
        }  
      }
    });
  },

  // Adds word cloud popovers on the timeline dates
  wordClouds: function(data) {
  
    var wordcloud = '';
    var wordmax = 50; // max # of words to allow in wordcloud
    var wordnum = 0;
    //var lastdate = d[0].date; // used to group words on the same date
  
    $.each(data, function (layerIndex, layer) {
      // Create a word cloud for each date in this layer
      $.each(layer['values'], function (dIndex, d) {
        var wordcloud = '';
        var wordnum = 0;
        var date = Number(d['date']);
        // Add each word to its word cloud
        $.each(d['words'], function (wordIndex, word) {
          // Calculate the size of the word, ignoring small ones
          var size = Math.log(word['value'])*4;
          if (size >= 4) {
            wordcloud = wordcloud + '<span style="font-size:' + size + 'px">' + word['term'] + '</span> ';
          }
        });
        // Add the wordcloud to the document
        if (wordcloud != "") {    // ignore empty word clouds to preserve "insufficient data" popovers
          var attachTo = $('.date-' + date);
          // Delete any existing popovers
          if (attachTo.popover('getData') != null) {
            attachTo.popover('destroy');
          }
          // Add the new popover
          $(attachTo).popover({
            'title': that.timestampToDate(date),
            'content': wordcloud,
            'position': 'top',
            'trigger': 'hover'
          });
        }
      });
    });
  },

  // Adds credit span to #description + popover
  giveCredit: function() {
    var content = ' <span id="credit">Built with <span id="creditlink">Attention Plotter</span>.</span>';
    $('#description p').append(content);
    window.setTimeout(that.creditPopover, 1);
  },
  
  creditPopover: function() {
    var content = 'Attention Plotter is part of the <a href="http://civic.mit.edu/controversy-mapper">Controversy Mapper</a> project at the <a href="http://civic.mit.edu/">MIT Center for Civic Media</a>.';
    $('#description p #creditlink').popover({
              'content': content,
              'position': 'right',
              'horizontalOffset': 20,
              'trigger': 'hover'
    });
  }
}

// Runs functions after page loads
$(window).load(function() {
  AttentionPlotter.buttonSwitcher();
  AttentionPlotter.giveCredit();
});
