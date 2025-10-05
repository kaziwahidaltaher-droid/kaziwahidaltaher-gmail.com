export class GameOfLife {
  private width: number;
  private height: number;
  private grid: number[][];
  private nextGrid: number[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = this.createEmptyGrid();
    this.nextGrid = this.createEmptyGrid();
  }

  private createEmptyGrid(): number[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => 0)
    );
  }

  randomize(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = Math.random() > 0.8 ? 1 : 0;
      }
    }
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + this.width) % this.width;
        const ny = (y + dy + this.height) % this.height;
        count += this.grid[ny][nx];
      }
    }
    return count;
  }

  step(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const neighbors = this.countNeighbors(x, y);
        const cell = this.grid[y][x];
        this.nextGrid[y][x] =
          cell === 1
            ? neighbors === 2 || neighbors === 3 ? 1 : 0
            : neighbors === 3 ? 1 : 0;
      }
    }

    // Swap grids
    [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
  }

  getGrid(): number[][] {
    return this.grid;
  }

  clear(): void {
    this.grid = this.createEmptyGrid();
    this.nextGrid = this.createEmptyGrid();
  }
}
