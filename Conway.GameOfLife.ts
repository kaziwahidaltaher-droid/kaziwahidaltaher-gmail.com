export class GameOfLife {
  private rows: number;
  private cols: number;
  private grid: number[][];
  private nextGrid: number[][];

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = this.createEmptyGrid();
    this.nextGrid = this.createEmptyGrid();
  }

  private createEmptyGrid(): number[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    );
  }

  public randomize(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = Math.random() > 0.7 ? 1 : 0;
      }
    }
  }

  public getGrid(): number[][] {
    return this.grid;
  }

  public step(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const neighbors = this.countNeighbors(r, c);
        const cell = this.grid[r][c];

        if (cell === 1 && (neighbors < 2 || neighbors > 3)) {
          this.nextGrid[r][c] = 0; // Death
        } else if (cell === 0 && neighbors === 3) {
          this.nextGrid[r][c] = 1; // Birth
        } else {
          this.nextGrid[r][c] = cell; // Survival
        }
      }
    }

    // Swap grids
    const temp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = temp;
  }

  private countNeighbors(row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          count += this.grid[r][c];
        }
      }
    }
    return count;
  }

  public clear(): void {
    this.grid = this.createEmptyGrid();
    this.nextGrid = this.createEmptyGrid();
  }

  public toggleCell(row: number, col: number): void {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.grid[row][col] = this.grid[row][col] ? 0 : 1;
    }
  }
}
