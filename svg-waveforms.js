function Model() {
  var self = this;

  self.shape = ko.observable('saw');
  self.harmonicCount = ko.observable(16);
  self.inverted = ko.observable(false);

  self.cycleCount = ko.observable(1);
  self.oversampling = ko.observable(1);

  self.strokeWidth = ko.observable(2);
  self.strokeColor = ko.observable("#000000");

  self.fillOpacity = ko.observable(0);
  self.fillColor = ko.observable("#000000");

  self.backgroundOpacity = ko.observable(0);
  self.backgroundColor = ko.observable("#000000");

  self.width = ko.observable(800);
  self.height = ko.observable(300);

  self.harmonics = ko.pureComputed(function() {
    var harmonics_count = (self.shape() === 'saw')
      ? self.harmonicCount()
      : self.harmonicCount() * 2;

    return _.map(_.range(0, harmonics_count), function(harmonic_index) {
      var harmonic = harmonic_index + 1;
      switch (self.shape()) {
        case 'saw':
          return {
            amp: 1 / harmonic,
            phase: self.inverted() ? Math.PI : 0
          };
        case 'square':
          return {
            amp: (harmonic % 2 == 0) ? 0 : 1.0 / harmonic,
            phase: self.inverted() ? 0 : Math.PI
          };
        case 'triangle':
          return {
            amp: (harmonic % 2 == 0) ? 0
              : Math.pow(-1, Math.floor(harmonic_index / 2))
                / Math.pow(2 * harmonic, 2),
            phase: self.inverted() ? 0 : Math.PI
          };
      }
    });
  }, self);

  self.wave = ko.pureComputed(function() {
    var sizeX = Math.round(self.width() * self.oversampling());

    return _.map(_.range(0, sizeX), function(sample) {
      var sample_phase = sample / (sizeX - 1)
      return {
        x: sample_phase,
        y:_.reduce(self.harmonics(), function(memo, harmonic, harmonic_index) {
          var harmonic_phase = harmonic.phase
            + (harmonic_index + 1) * self.cycleCount() * 2 * Math.PI * sample_phase;
          return memo + harmonic.amp * Math.sin(harmonic_phase);
        }, 0)
      };
    });
  }, self);

  self.svgBlob = ko.computed(function() {
    var waveMin = _.min(self.wave(), function(sample) { return sample.y; }).y;
    var waveMax = _.max(self.wave(), function(sample) { return sample.y; }).y;

    var halfStrokeWidth = self.strokeWidth() / 2;
    var xScale = d3.scale.linear()
      .domain([0, 1])
      .range([halfStrokeWidth, self.width() - halfStrokeWidth]);
    var yScale = d3.scale.linear()
      .domain([waveMin, waveMax])
      .range([halfStrokeWidth, self.height() - halfStrokeWidth]);
    var lineFunction = d3.svg.line()
      .x(function(d) { return xScale(d.x); })
      .y(function(d) { return yScale(d.y); })
      .interpolate("linear");

    d3.select("#wave-svg").selectAll("svg").remove();
    var svg = d3.select("#wave-svg").append("svg")
      .attr("width", self.width())
      .attr("height", self.height());

    if (self.backgroundOpacity() > 0) {
      svg.append("rect")
        .attr("width", self.width())
        .attr("height", self.height())
        .attr("fill", self.backgroundColor())
        .attr("fill-opacity", self.backgroundOpacity());
    }

    svg.append("path")
      .attr("d", lineFunction(self.wave()))
      .attr("stroke", self.strokeColor())
      .attr("stroke-width", self.strokeWidth())
      .attr("stroke-linecap", "flat")
      .attr("fill", self.fillColor())
      .attr("fill-opacity", self.fillOpacity());

    var serializer = new XMLSerializer();
    return new Blob(
      [serializer.serializeToString($("#wave-svg svg")[0])],
      {type: 'image/svg'});
  }, self);
}

$(document).ready(function() {
  var model = new Model();
  ko.applyBindings(model);

  var self = this;
  self.download_url = null;
  model.svgBlob.subscribe(function() {
    if (self.download_url !== null) {
      window.URL.revokeObjectURL(self.download_url);
    }
    self.download_url = window.URL.createObjectURL(model.svgBlob());
    $("#download").attr("href", self.download_url);
  });
});
