/**
 * 2048游戏AI助手
 * 提供智能提示、最佳移动建议和游戏策略分析
 */

class AI2048Helper {
    constructor() {
        this.size = 4;
        this.directions = ['up', 'down', 'left', 'right'];
        this.weights = {
            score: 1.0,          // 分数权重
            monotonicity: 1.0,   // 单调性权重
            smoothness: 0.1,     // 平滑度权重
            emptyCells: 2.7,     // 空格权重
            maxTile: 1.0         // 最大数字权重
        };
    }

    /**
     * 获取最佳移动建议
     * @param {Array} grid - 当前游戏网格
     * @param {number} depth - 搜索深度
     * @returns {Object} 移动建议和分析
     */
    getBestMove(grid, depth = 3) {
        const startTime = Date.now();
        let bestMove = null;
        let bestScore = -Infinity;
        let moveAnalysis = {};

        // 评估每个可能的移动
        for (let direction of this.directions) {
            const clonedGrid = this.cloneGrid(grid);
            const moveResult = this.simulateMove(clonedGrid, direction);
            
            if (moveResult.moved) {
                // 使用minimax算法评估移动
                const score = this.minimax(moveResult.grid, depth, false, -Infinity, Infinity);
                
                moveAnalysis[direction] = {
                    score: score,
                    immediate: moveResult.score,
                    emptyCells: this.getEmptyCells(moveResult.grid).length,
                    evaluation: this.evaluateGrid(moveResult.grid)
                };

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = direction;
                }
            }
        }

        const endTime = Date.now();
        
        return {
            bestMove,
            confidence: this.calculateConfidence(moveAnalysis, bestMove),
            analysis: moveAnalysis,
            computeTime: endTime - startTime,
            strategy: this.getStrategy(grid, bestMove)
        };
    }

    /**
     * Minimax算法实现
     */
    minimax(grid, depth, isMaximizing, alpha, beta) {
        if (depth === 0) {
            return this.evaluateGrid(grid);
        }

        if (isMaximizing) {
            // 玩家回合 - 选择最佳移动
            let maxEval = -Infinity;
            
            for (let direction of this.directions) {
                const clonedGrid = this.cloneGrid(grid);
                const moveResult = this.simulateMove(clonedGrid, direction);
                
                if (moveResult.moved) {
                    const evaluation = this.minimax(moveResult.grid, depth - 1, false, alpha, beta);
                    maxEval = Math.max(maxEval, evaluation);
                    alpha = Math.max(alpha, evaluation);
                    
                    if (beta <= alpha) break; // Alpha-beta剪枝
                }
            }
            
            return maxEval === -Infinity ? this.evaluateGrid(grid) : maxEval;
        } else {
            // 随机方块生成回合
            let minEval = Infinity;
            const emptyCells = this.getEmptyCells(grid);
            
            if (emptyCells.length === 0) {
                return this.evaluateGrid(grid);
            }

            // 评估在空格中放置2或4的情况
            for (let cell of emptyCells.slice(0, Math.min(4, emptyCells.length))) {
                for (let value of [2, 4]) {
                    const clonedGrid = this.cloneGrid(grid);
                    clonedGrid[cell.row][cell.col] = value;
                    
                    const probability = value === 2 ? 0.9 : 0.1;
                    const evaluation = this.minimax(clonedGrid, depth - 1, true, alpha, beta);
                    minEval = Math.min(minEval, evaluation * probability);
                    beta = Math.min(beta, evaluation);
                    
                    if (beta <= alpha) break;
                }
                if (beta <= alpha) break;
            }
            
            return minEval === Infinity ? this.evaluateGrid(grid) : minEval;
        }
    }

    /**
     * 网格评估函数
     */
    evaluateGrid(grid) {
        const scores = {
            monotonicity: this.calculateMonotonicity(grid),
            smoothness: this.calculateSmoothness(grid),
            emptyCells: this.getEmptyCells(grid).length,
            maxTile: this.getMaxTile(grid),
            cornerBonus: this.calculateCornerBonus(grid)
        };

        return (
            scores.monotonicity * this.weights.monotonicity +
            scores.smoothness * this.weights.smoothness +
            Math.log2(scores.emptyCells + 1) * this.weights.emptyCells +
            Math.log2(scores.maxTile) * this.weights.maxTile +
            scores.cornerBonus * 0.5
        );
    }

    /**
     * 计算单调性（数字大小的有序程度）
     */
    calculateMonotonicity(grid) {
        let monotonicity = 0;

        // 检查行和列的单调性
        for (let i = 0; i < this.size; i++) {
            // 行单调性
            let rowIncreasing = 0, rowDecreasing = 0;
            for (let j = 0; j < this.size - 1; j++) {
                if (grid[i][j] > grid[i][j + 1]) rowDecreasing++;
                if (grid[i][j] < grid[i][j + 1]) rowIncreasing++;
            }
            monotonicity += Math.max(rowIncreasing, rowDecreasing);

            // 列单调性
            let colIncreasing = 0, colDecreasing = 0;
            for (let j = 0; j < this.size - 1; j++) {
                if (grid[j][i] > grid[j + 1][i]) colDecreasing++;
                if (grid[j][i] < grid[j + 1][i]) colIncreasing++;
            }
            monotonicity += Math.max(colIncreasing, colDecreasing);
        }

        return monotonicity;
    }

    /**
     * 计算平滑度（相邻格子的数值差异）
     */
    calculateSmoothness(grid) {
        let smoothness = 0;

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (grid[i][j] === 0) continue;

                const value = Math.log2(grid[i][j]);
                
                // 检查右边的格子
                if (j < this.size - 1 && grid[i][j + 1] !== 0) {
                    const rightValue = Math.log2(grid[i][j + 1]);
                    smoothness -= Math.abs(value - rightValue);
                }
                
                // 检查下边的格子
                if (i < this.size - 1 && grid[i + 1][j] !== 0) {
                    const downValue = Math.log2(grid[i + 1][j]);
                    smoothness -= Math.abs(value - downValue);
                }
            }
        }

        return smoothness;
    }

    /**
     * 计算角落奖励（大数字在角落更好）
     */
    calculateCornerBonus(grid) {
        const corners = [
            grid[0][0], grid[0][this.size - 1],
            grid[this.size - 1][0], grid[this.size - 1][this.size - 1]
        ];
        
        const maxTile = this.getMaxTile(grid);
        return corners.includes(maxTile) ? Math.log2(maxTile) : 0;
    }

    /**
     * 获取最大数字
     */
    getMaxTile(grid) {
        let max = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                max = Math.max(max, grid[i][j]);
            }
        }
        return max;
    }

    /**
     * 获取空格子
     */
    getEmptyCells(grid) {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (grid[i][j] === 0) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        return emptyCells;
    }

    /**
     * 模拟移动
     */
    simulateMove(grid, direction) {
        let moved = false;
        let score = 0;

        for (let i = 0; i < this.size; i++) {
            let line = this.getLine(grid, direction, i);
            let { newLine, lineScore, hasMoved } = this.mergeLine(line);
            
            if (hasMoved) {
                moved = true;
                score += lineScore;
                this.setLine(grid, direction, i, newLine);
            }
        }

        return { grid, moved, score };
    }

    /**
     * 获取指定方向的行/列
     */
    getLine(grid, direction, index) {
        switch (direction) {
            case 'left':
                return grid[index];
            case 'right':
                return [...grid[index]].reverse();
            case 'up':
                return grid.map(row => row[index]);
            case 'down':
                return grid.map(row => row[index]).reverse();
        }
    }

    /**
     * 设置指定方向的行/列
     */
    setLine(grid, direction, index, line) {
        switch (direction) {
            case 'left':
                grid[index] = line;
                break;
            case 'right':
                grid[index] = [...line].reverse();
                break;
            case 'up':
                for (let i = 0; i < this.size; i++) {
                    grid[i][index] = line[i];
                }
                break;
            case 'down':
                const reversedLine = [...line].reverse();
                for (let i = 0; i < this.size; i++) {
                    grid[i][index] = reversedLine[i];
                }
                break;
        }
    }

    /**
     * 合并行/列
     */
    mergeLine(line) {
        let newLine = line.filter(cell => cell !== 0);
        let score = 0;
        let hasMoved = false;

        // 合并相同数字
        for (let i = 0; i < newLine.length - 1; i++) {
            if (newLine[i] === newLine[i + 1]) {
                newLine[i] *= 2;
                score += newLine[i];
                newLine.splice(i + 1, 1);
            }
        }

        // 填充0
        while (newLine.length < this.size) {
            newLine.push(0);
        }

        // 检查是否有移动
        for (let i = 0; i < this.size; i++) {
            if (line[i] !== newLine[i]) {
                hasMoved = true;
                break;
            }
        }

        return { newLine, score, hasMoved };
    }

    /**
     * 克隆网格
     */
    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    /**
     * 计算信心度
     */
    calculateConfidence(analysis, bestMove) {
        if (!bestMove || !analysis[bestMove]) return 0;

        const scores = Object.values(analysis).map(a => a.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        if (maxScore === minScore) return 100;

        const bestScore = analysis[bestMove].score;
        const confidence = ((bestScore - minScore) / (maxScore - minScore)) * 100;
        
        return Math.round(confidence);
    }

    /**
     * 获取策略建议
     */
    getStrategy(grid, bestMove) {
        const emptyCells = this.getEmptyCells(grid).length;
        const maxTile = this.getMaxTile(grid);

        if (emptyCells <= 3) {
            return "🚨 危险！空间不足，专注于合并和创造空间";
        } else if (maxTile >= 1024) {
            return "🎯 接近胜利！保持大数字在角落，稳步前进";
        } else if (maxTile >= 512) {
            return "💪 进展良好！继续建立单调递减的布局";
        } else if (emptyCells >= 10) {
            return "🌱 游戏初期，专注于将大数字移向角落";
        } else {
            return "⚖️ 平衡发展，注意保持网格的组织性";
        }
    }

    /**
     * 获取移动方向的中文名称
     */
    getDirectionText(direction) {
        const directionMap = {
            'up': '↑ 向上',
            'down': '↓ 向下', 
            'left': '← 向左',
            'right': '→ 向右'
        };
        return directionMap[direction] || direction;
    }

    /**
     * 分析当前局面
     */
    analyzePosition(grid) {
        const analysis = {
            emptyCells: this.getEmptyCells(grid).length,
            maxTile: this.getMaxTile(grid),
            score: this.evaluateGrid(grid),
            monotonicity: this.calculateMonotonicity(grid),
            smoothness: this.calculateSmoothness(grid),
            cornerBonus: this.calculateCornerBonus(grid)
        };

        // 计算危险等级
        if (analysis.emptyCells <= 2) {
            analysis.dangerLevel = "🔴 极危险";
        } else if (analysis.emptyCells <= 4) {
            analysis.dangerLevel = "🟡 危险";
        } else if (analysis.emptyCells <= 8) {
            analysis.dangerLevel = "🟢 安全";
        } else {
            analysis.dangerLevel = "🟢 非常安全";
        }

        return analysis;
    }
}

// 导出AI助手类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI2048Helper;
} else if (typeof window !== 'undefined') {
    window.AI2048Helper = AI2048Helper;
}
