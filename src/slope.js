import 'leaflet-i18n';
import * as _ from './utils';
import * as D3 from './components';
import { Elevation } from './control';

Elevation.addInitHook(function() {

	if (!this.options.slope) return;

	let opts = this.options;
	let slope = {};
	opts.margins.right = 50;

	if (this.options.slope != "summary") {

		this.on("elechart_init", function() {
			slope.path = this._area.append('path')
				.style("pointer-events", "none")
				// TODO: add a class here.
				.attr("fill", "#F00")
				.attr("stroke", "#000")
				.attr("stroke-opacity", "0.5")
				.attr("fill-opacity", "0.25");
		});

		this.on("elechart_axis", function() {
			slope.x = this._x;

			// slope.x = D3.Scale({
			// 	data: this._data,
			// 	range: [0, this._width()],
			// 	attr: opts.xAttr,
			// 	min: opts.xAxisMin,
			// 	max: opts.xAxisMax,
			// 	forceBounds: opts.forceAxisBounds,
			// });

			slope.y = D3.Scale({
				data: this._data,
				range: [this._height(), 0],
				attr: "slope",
				min: -1,
				max: +1,
				forceBounds: opts.forceAxisBounds,
			});

			slope.axis = D3.Axis({
				axis: "y",
				position: "right",
				width: this._width(),
				height: this._height(),
				scale: slope.y,
				ticks: this.options.yTicks,
				tickPadding: 16,
				label: "%",
				labelX: 25,
				labelY: 3,
			});

			this._axis.call(slope.axis);
		});

		this.on("elechart_updated", function() {
			slope.area = D3.Area({
				interpolation: "curveStepAfter",
				data: this._data,
				name: 'Slope',
				xAttr: opts.xAttr,
				yAttr: "slope",
				width: this._width(),
				height: this._height(),
				scaleX: slope.x,
				scaleY: slope.y,
			});

			slope.path.call(slope.area);
		});

		this.on("elechart_legend", function() {
			slope.legend = this._legend.append("g")
				.call(
					D3.LegendItem({
						name: 'Slope',
						width: this._width(),
						height: this._height(),
						margins: this.options.margins,
					})
				);

			this._altitudeLegend
				.attr("transform", "translate(-50, 0)");

			slope.legend
				.attr("transform", "translate(50, 0)");

			slope.legend.select("rect")
				.classed("area", false)
				// TODO: add a class here.
				.attr("fill", "#F00")
				.attr("stroke", "#000")
				.attr("stroke-opacity", "0.5")
				.attr("fill-opacity", "0.25");

		});
	}

	this.on("eledata_updated", function(e) {
		let data = this._data;
		let i = e.index;
		let z = data[i].z;

		let curr = data[i].latlng;
		let prev = i > 0 ? data[i - 1].latlng : curr;

		let delta = curr.distanceTo(prev) * this._distanceFactor;

		// Slope / Gain
		let tAsc = this._tAsc || 0; // Total Ascent
		let tDes = this._tDes || 0; // Total Descent
		let sMax = this._sMax || 0; // Slope Max
		let sMin = this._sMin || 0; // Slope Min
		let diff = 0;
		let slope = 0;

		if (!isNaN(z)) {
			// diff height between actual and previous point
			diff = i > 0 ? z - data[i - 1].z : 0;
			if (diff > 0) tAsc += diff;
			if (diff < 0) tDes -= diff;
			// slope in % = ( height / length ) * 100
			slope = delta !== 0 ? Math.round((diff / delta) * 10000) / 100 : 0;
			// apply slope to the previous point because we will
			// ascent or desent, so the slope is in the fist point
			if (i > 0) data[i - 1].slope = slope;
			sMax = slope > sMax ? slope : sMax;
			sMin = slope < sMin ? slope : sMin;
		}

		data[i].slope = slope;

		this.track_info = this.track_info || {};
		this.track_info.ascent = this._tAsc = tAsc;
		this.track_info.descent = this._tDes = tDes;
		this.track_info.slope_max = this._sMax = sMax;
		this.track_info.slope_min = this._sMin = sMin;
	});

	this.on("elechart_change", function(e) {
		let item = e.data;
		let xCoordinate = e.xCoord;

		if (this._focuslabel) {
			if (!this._focuslabelSlope || !this._focuslabelSlope.property('isConnected')) {
				this._focuslabelSlope = this._focuslabel.select('text').insert("svg:tspan", ".mouse-focus-label-x")
					.attr("class", "mouse-focus-label-slope")
					.attr("dy", "1.5em");
			}

			this._focuslabelSlope.text(item.slope + "%");

			this._focuslabel.select('.mouse-focus-label-x')
				.attr("dy", "1.5em");
		}

		if (this._mouseHeightFocusLabel) {
			if (!this._mouseSlopeFocusLabel) {
				this._mouseSlopeFocusLabel = this._mouseHeightFocusLabel.append("svg:tspan")
					.attr("class", "height-focus-slope ");
			}

			this._mouseSlopeFocusLabel
				.attr("dy", "1.5em")
				.text(Math.round(item.slope) + "%");

			this._mouseHeightFocusLabel.select('.height-focus-y')
				.attr("dy", "-1.5em");
		}
	});

	this.on("elechart_summary", function() {
		this.track_info.ascent = this._tAsc || 0;
		this.track_info.descent = this._tDes || 0;
		this.track_info.slope_max = this._sMax || 0;
		this.track_info.slope_min = this._sMin || 0;

		this.summaryDiv.querySelector('.minele').insertAdjacentHTML('afterend', '<span class="ascent"><span class="summarylabel">' + L._("Total Ascent: ") + '</span><span class="summaryvalue">' + Math.round(this.track_info.ascent) + '&nbsp;' +
			this._yLabel +
			'</span></span>' + '<span class="descent"><span class="summarylabel">' + L._("Total Descent: ") + '</span><span class="summaryvalue">' + Math.round(this.track_info.descent) + '&nbsp;' + this._yLabel +
			'</span></span>' + '<span class="minslope"><span class="summarylabel">' + L._("Min Slope: ") + '</span><span class="summaryvalue">' + this.track_info.slope_min + '&nbsp;' + '%' +
			'</span></span>' + '<span class="maxslope"><span class="summarylabel">' + L._("Max Slope: ") + '</span><span class="summaryvalue">' + this.track_info.slope_max + '&nbsp;' + '%' +
			'</span></span>');
	});

	this.on("eledata_clear", function() {
		this._sMax = null;
		this._sMin = null;
		this._tAsc = null;
		this._tDes = null;
	});

});