/**
 * Game of Life
 * Refactored into a controllable ES6 module.
 */

export class Cell {
    public row: number;
    public col: number;
    public live: boolean;

    constructor(row: number, col: number, live: boolean) {
        this.row = row;
        this.col = col;
        this.live = live;
    }
}

export class GameOfLife {
    private gridSize: number;
    private canvasSize: number;
    private lineColor: string;
    private liveColor: string;
    private deadColor: string;
    private initialLifeProbability: number;
    private animationRate: number;
    private cellSize: number;
    private context: CanvasRenderingContext2D;
    private world: Cell[][];
    private timeoutId: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.gridSize = 100; // Increased resolution for detail
        this.canvasSize = canvas.width;
        this.lineColor = 'rgba(0, 255, 255, 0.1)'; // Thematic color
        this.liveColor = '#00ffff'; // Thematic color
        this.deadColor = 'rgba(0, 0, 0, 0)'; // Transparent background
        this.initialLifeProbability = 0.25;
        this.animationRate = 100;
        this.cellSize = this.canvasSize / this.gridSize;
        this.context = canvas.getContext('2d')!;
        this.world = this.createWorld();
    }

    public start(): void {
        if (this.timeoutId === null) {
            this.world = this.createWorld(); // Reset on start
            this.circleOfLife();
        }
    }

    public stop(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    private createWorld(): Cell[][] {
        return this.travelWorld((cell: Cell) => {
            cell.live = Math.random() < this.initialLifeProbability;
            return cell;
        });
    }

    private circleOfLife(): void {
        this.world = this.travelWorld((cell: Cell) => {
            const currentCell = this.world[cell.row][cell.col];
            this.draw(currentCell);
            return this.resolveNextGeneration(currentCell);
        });
        this.timeoutId = window.setTimeout(() => this.circleOfLife(), this.animationRate);
    }

    private resolveNextGeneration(cell: Cell): Cell {
        const count = this.countNeighbors(cell);
        const newCell = new Cell(cell.row, cell.col, cell.live);
        if (count < 2 || count > 3) {
            newCell.live = false;
        } else if (count === 3) {
            newCell.live = true;
        }
        return newCell;
    }

    private countNeighbors(cell: Cell): number {
        let neighbors = 0;
        for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col++) {
                if (row === 0 && col === 0) continue;
                if (this.isAlive(cell.row + row, cell.col + col)) {
                    neighbors++;
                }
            }
        }
        return neighbors;
    }

    private isAlive(row: number, col: number): boolean {
        // Wrap around edges for a toroidal array
        const r = (row + this.gridSize) % this.gridSize;
        const c = (col + this.gridSize) % this.gridSize;
        return this.world[r][c].live;
    }

    private travelWorld(callback: (cell: Cell) => Cell): Cell[][] {
        const result: Cell[][] = [];
        for (let row = 0; row < this.gridSize; row++) {
            const rowData: Cell[] = [];
            for (let col = 0; col < this.gridSize; col++) {
                rowData.push(callback(new Cell(row, col, false)));
            }
            result.push(rowData);
        }
        return result;
    }

    private draw(cell: Cell): void {
        this.context.fillStyle = cell.live ? this.liveColor : this.deadColor;
        this.context.clearRect(cell.col * this.cellSize, cell.row * this.cellSize, this.cellSize, this.cellSize);
        this.context.fillRect(cell.col * this.cellSize, cell.row * this.cellSize, this.cellSize, this.cellSize);
        
        // Only draw grid lines if they are not fully transparent
        if (this.lineColor !== 'rgba(0, 0, 0, 0)') {
            this.context.strokeStyle = this.lineColor;
            this.context.strokeRect(cell.col * this.cellSize, cell.row * this.cellSize, this.cellSize, this.cellSize);
        }
    }
}