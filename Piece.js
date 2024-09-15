// Piece.js

import { DIRECTIONS, BOARD_SIZE } from './Constants.js';

// Base Piece class
export class Piece {
    constructor(color, shape, steps) {
        this.color = color;
        this.shape = shape;
        this.steps = steps;
    }

    getSymbol() {
        switch (this.shape) {
            case 'triangle':
                return this.color === 'red' ? '▲' : '▼';
            case 'square':
                return '◊';
            case 'hexagon':
                return '⬢';
            case 'octagon':
                return '○';
            default:
                return '';
        }
    }

    getClass() {
        return `piece piece-${this.color}`;
    }

    // Updated canCapture method
    canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol) {
        // Cannot capture own pieces
        if (this.color === targetPiece.color) return false;

        // Calculate the direction of the attack
        const rowDiff = targetRow - fromRow;
        const colDiff = targetCol - fromCol;

        // Normalize direction
        const dir = { row: Math.sign(rowDiff), col: Math.sign(colDiff) };

        // Determine if the attack is from the side or behind
        const isSideOrBackAttack = this.isSideOrBackAttack(dir, targetPiece);

        // Combat rules
        if (isSideOrBackAttack) {
            return true; // Can capture regardless of corners
        } else {
            // Compare number of corners
            const attackerCorners = this.getCorners();
            const defenderCorners = targetPiece.getCorners();

            if (attackerCorners <= defenderCorners) {
                return true; // Attacker captures if it has fewer or equal corners
            } else {
                return false; // Attacker cannot capture if it has more corners
            }
        }
    }

    // Determine if the attack is from the side or behind
    isSideOrBackAttack(dir, targetPiece) {
        // Define the front directions based on the target piece's orientation
        const frontDirections = targetPiece.getFrontDirections();

        // If the attack is not from the front, it's from the side or back
        return !frontDirections.some(
            (fd) => fd.row === dir.row && fd.col === dir.col
        );
    }

    // Should be overridden by subclasses to define front directions
    getFrontDirections() {
        return [];
    }

    // Should be overridden by subclasses to return the number of corners
    getCorners() {
        return 0;
    }
}

// Triangle class 
export class Triangle extends Piece {
    constructor(color) {
        super(color, 'triangle', 2);
    }

    getCorners() {
        return 3;
    }

    getFrontDirections() {
        // Triangles face forward (depending on color)
        return this.color === 'red' ? [DIRECTIONS.N] : [DIRECTIONS.S];
    }

    getValidMoves(fromRow, fromCol, board) {
        const directions = this.color === 'red'
            ? [DIRECTIONS.N, DIRECTIONS.SW, DIRECTIONS.SE]
            : [DIRECTIONS.S, DIRECTIONS.NW, DIRECTIONS.NE];

        return calculatePieceMoves(this, fromRow, fromCol, directions, board);
    }

    mergeWith(otherPiece) {
        if (
            otherPiece.shape === 'triangle' &&
            otherPiece.color === this.color
        ) {
            return new Square(this.color);
        }
        return null;
    }
}

// Square class remains unchanged except for canCapture
export class Square extends Piece {
    constructor(color) {
        super(color, 'square', 3);
    }

    getCorners() {
        return 4;
    }

    getFrontDirections() {
        // Squares can face all directions
        return [DIRECTIONS.N, DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.W];
    }

    getValidMoves(fromRow, fromCol, board) {
        // Squares move only in N, E, S, W
        const directions = [
            DIRECTIONS.N,
            DIRECTIONS.E,
            DIRECTIONS.S,
            DIRECTIONS.W,
        ];
        return calculatePieceMoves(this, fromRow, fromCol, directions, board);
    }

    // The canCapture method 
    canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol) {
        if (targetPiece.shape === 'triangle') {
            // Calculate the direction of the attack
            const rowDiff = targetRow - fromRow;
            const colDiff = targetCol - fromCol;
            const dir = { row: Math.sign(rowDiff), col: Math.sign(colDiff) };
    
            let allowedDirections = [];
    
            if (this.color === 'red') {
                // Black Squares can capture Triangles from specific directions
                allowedDirections = [
                    DIRECTIONS.S, // South
                    DIRECTIONS.W, // West
                    DIRECTIONS.E, // East
                    DIRECTIONS.SW, // Southwest
                    DIRECTIONS.SE  // Southeast
                ];
            } else if (this.color === 'black') {
                // Red Squares can capture Triangles from specific directions
                allowedDirections = [
                    DIRECTIONS.N, // North
                    DIRECTIONS.W, // West
                    DIRECTIONS.E, // East
                    DIRECTIONS.NW, // Northwest
                    DIRECTIONS.NE  // Northeast
                ];
            }
    
            // Check if attack direction is allowed
            if (allowedDirections.some(d => d.row === dir.row && d.col === dir.col)) {
                return true;
            } else {
                return false;
            }
        } else {
            // Use base class canCapture for other cases
            return super.canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol);
        }
    }
    

    mergeWith(otherPiece) {
        if (
            otherPiece.shape === 'square' &&
            otherPiece.color === this.color
        ) {
            return new Hexagon(this.color);
        }
        return null;
    }
}

export class Hexagon extends Piece {
    constructor(color) {
        super(color, 'hexagon', 5);
    }

    getCorners() {
        return 6;
    }

    getFrontDirections() {
        // Hexagons face forward based on their color
        return this.color === 'red'
            ? [DIRECTIONS.N, DIRECTIONS.NE, DIRECTIONS.NW]
            : [DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.SW];
    }

    getValidMoves(fromRow, fromCol, board) {
        // Hexagons cannot move W and E
        const directions = this.color === 'red'
            ? [DIRECTIONS.N, DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.SW]
            : [DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.SW, DIRECTIONS.N, DIRECTIONS.NE, DIRECTIONS.NW];

        // Remove W and E from possible directions
        const filteredDirections = directions.filter(dir => dir !== DIRECTIONS.W && dir !== DIRECTIONS.E);

        return calculatePieceMoves(this, fromRow, fromCol, filteredDirections, board);
    }

    // canCapture method
    canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol) {
        if (targetPiece.shape === 'triangle') {
            // Calculate direction of the attack
            const rowDiff = targetRow - fromRow;
            const colDiff = targetCol - fromCol;
            const dir = { row: Math.sign(rowDiff), col: Math.sign(colDiff) };

            let allowedDirections = [];

            if (this.color === 'black') {
                // Black Hexagons can capture Triangles from N, NW, NE
                allowedDirections = [DIRECTIONS.N, DIRECTIONS.SW, DIRECTIONS.SE];
            } else if (this.color === 'red') {
                // Red Hexagons can capture Triangles from S, SW, SE
                allowedDirections = [DIRECTIONS.S, DIRECTIONS.NW, DIRECTIONS.NE];
            }

            // Check if attack direction is allowed
            if (allowedDirections.some(d => d.row === dir.row && d.col === dir.col)) {
                return true;
            } else {
                return false;
            }
        } else {
            // Use base class canCapture for other cases
            return super.canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol);
        }
    }

    mergeWith(otherPiece) {
        if (otherPiece.shape === 'hexagon' && otherPiece.color === this.color) {
            return new Octagon(this.color);
        }
        return null;
    }
}

// Octagon class
export class Octagon extends Piece {
    constructor(color) {
        super(color, 'octagon', 7);
    }

    getCorners() {
        return 8;
    }

    getFrontDirections() {
        // Octagons face all directions
        return Object.values(DIRECTIONS);
    }

    getValidMoves(fromRow, fromCol, board) {
        const directions = Object.values(DIRECTIONS);
        return calculatePieceMoves(this, fromRow, fromCol, directions, board);
    }

// Updated canCapture method for Octagon
canCapture(targetPiece, fromRow, fromCol, targetRow, targetCol) {
    // Calculate direction of the attack
    const rowDiff = targetRow - fromRow;
    const colDiff = targetCol - fromCol;
    const dir = { row: Math.sign(rowDiff), col: Math.sign(colDiff) };

    // Define allowed directions based on target piece
    let allowedDirections = [];

    // Hexagon capture logic (same for both colors)
    if (targetPiece.shape === 'hexagon') {
        allowedDirections = [DIRECTIONS.W, DIRECTIONS.E];
    }
    // Triangle capture logic (color-dependent)
    else if (targetPiece.shape === 'triangle') {
        if (this.color === 'red') {
            // Red Octagons can capture Triangles from S, W, E, NW, and NE
            allowedDirections = [DIRECTIONS.S, DIRECTIONS.W, DIRECTIONS.E, DIRECTIONS.NW, DIRECTIONS.NE];
        } else if (this.color === 'black') {
            // Black Octagons can capture Triangles from N, W, E, SW, and SE
            allowedDirections = [DIRECTIONS.N, DIRECTIONS.W, DIRECTIONS.E, DIRECTIONS.SW, DIRECTIONS.SE];
        }
    }
    // Square capture logic
    else if (targetPiece.shape === 'square') {
        if (this.color === 'red') {
            // Red Octagons cannot capture Squares from N, E, W, or S
            allowedDirections = [DIRECTIONS.NW, DIRECTIONS.NE, DIRECTIONS.SW, DIRECTIONS.SE];
        } else if (this.color === 'black') {
            // Black Octagons cannot capture Squares from N, E, W, or S
            allowedDirections = [DIRECTIONS.NW, DIRECTIONS.NE, DIRECTIONS.SW, DIRECTIONS.SE];
        }
    } else {
        // Default behavior for other pieces
        allowedDirections = Object.values(DIRECTIONS);
    }

    // Check if attack direction is allowed
    return allowedDirections.some(d => d.row === dir.row && d.col === dir.col);
}
    mergeWith(otherPiece) {
        if (otherPiece instanceof Octagon && otherPiece.color === this.color) {
            return this; // Return the current octagon after merging
        }
        return null; // Octagons cannot merge with other shapes
    }
    }

// Helper function to calculate moves
function calculatePieceMoves(piece, fromRow, fromCol, directions, board) {
    const possibleMoves = [];

    directions.forEach(dir => {
        for (let i = 1; i <= piece.steps; i++) {
            const newRow = fromRow + dir.row * i;
            const newCol = fromCol + dir.col * i;

            if (isInBounds(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (targetPiece === null) {
                    possibleMoves.push({ row: newRow, col: newCol });
                } else {
                    if (targetPiece.color !== piece.color) {
                        const combatResult = piece.canCapture(targetPiece, fromRow, fromCol, newRow, newCol);
                        if (combatResult) {
                            possibleMoves.push({
                                row: newRow,
                                col: newCol,
                                eat: true,
                                both: combatResult === 'both'
                            });
                        }
                    } else {
                        const mergedPiece = piece.mergeWith(targetPiece);
                        if (mergedPiece) {
                            possibleMoves.push({ row: newRow, col: newCol, merge: mergedPiece });
                        }
                    }
                    break; // Cannot move past another piece
                }
            } else {
                break; // Out of bounds
            }
        }
    });

    return possibleMoves;
}

// Utility function to check if a position is within the board
function isInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}
