// Visualization system using D3
class VisualizationManager {
  constructor() {
    this.svg = null;
    this.color = null;
  }

  setupVisualization() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const numberOfNodes = 200;

    STATE.nodes = d3.range(numberOfNodes).map(() => ({ radius: Math.random() * 12 + 4 }));
    STATE.nodes[0].radius = 0;
    STATE.nodes[0].fixed = true;

    STATE.force = d3.layout.force()
      .gravity(0.05)
      .charge((d, i) => i ? 0 : -2000)
      .nodes(STATE.nodes)
      .size([width, height])
      .start();

    this.svg = d3.select("#gameArea").append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("top", "0px")
      .style("left", "0px")
      .style("z-index", 50000);

    this.color = d3.scale.category10();
    const colors = [];
    for (let i = 0; i < numberOfNodes - 2; i++) {
      colors[i] = this.color(0);
    }
    colors.push("orange");

    this.svg.selectAll("circle")
      .data(STATE.nodes.slice(1))
      .enter().append("circle")
      .attr("r", d => d.radius)
      .style("fill", (d, i) => colors[i]);

    STATE.force.on("tick", (e) => {
      const q = d3.geom.quadtree(STATE.nodes);
      let i = 0;
      const n = STATE.nodes.length;

      while (++i < n) q.visit(this.collide(STATE.nodes[i]));

      this.svg.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    this.addGazeVisualization();
  }

  addGazeVisualization() {
    this.svg.append("line")
      .attr("id", "eyeline1")
      .attr("stroke-width", 2)
      .attr("stroke", "red");

    this.svg.append("line")
      .attr("id", "eyeline2")
      .attr("stroke-width", 2)
      .attr("stroke", "red");

    this.svg.append("rect")
      .attr("id", "predictionSquare")
      .attr("width", 6)
      .attr("height", 6)
      .attr("fill", "red");
  }

  updateGazeVisualization(data, fmPositions, whr) {
    // Update collision system
    STATE.nodes[0].px = data.x;
    STATE.nodes[0].py = data.y;
    STATE.force.resume();

    // Update eye lines
    try {
      const leftEye = fmPositions[145];
      const rightEye = fmPositions[374];

      if (leftEye && rightEye) {
        const leftX = CONFIG.PREVIEW_WIDTH - leftEye[0] * whr[0];
        const leftY = leftEye[1] * whr[1];
        const rightX = CONFIG.PREVIEW_WIDTH - rightEye[0] * whr[0];
        const rightY = rightEye[1] * whr[1];

        d3.select('#eyeline1')
          .attr("x1", data.x)
          .attr("y1", data.y)
          .attr("x2", leftX)
          .attr("y2", leftY);

        d3.select("#eyeline2")
          .attr("x1", data.x)
          .attr("y1", data.y)
          .attr("x2", rightX)
          .attr("y2", rightY);
      }
    } catch (e) {
      // Ignore if indices don't exist
    }

    d3.select("#predictionSquare")
      .attr("x", data.x)
      .attr("y", data.y);
  }

  collide(node) {
    const r = node.radius + 16;
    const nx1 = node.x - r;
    const nx2 = node.x + r;
    const ny1 = node.y - r;
    const ny2 = node.y + r;
    
    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        let x = node.x - quad.point.x;
        let y = node.y - quad.point.y;
        let l = Math.sqrt(x * x + y * y);
        const r = node.radius + quad.point.radius;
        
        if (l < r) {
          l = (l - r) / l * 0.5;
          node.x -= x *= l;
          node.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  }
}

// Global visualization manager instance
const visualizationManager = new VisualizationManager();