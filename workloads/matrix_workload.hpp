#pragma once

#include "../benchmark_types.hpp"
#include <vector>

class MatrixWorkload final : public Workload {
public:
    MatrixWorkload(int rows, int inner, int columns);
    WorkloadDescription description() const override;
    bool run(int threads) override;
    bool verify() const override;

private:
    class Matrix {
    public:
        std::vector<std::vector<int>> mat;
        int r = 0;
        int c = 0;
        void matrix_builder(int rows, int cols);
        bool multiply(const Matrix& other, Matrix& result, int threads) const;
        bool equals(const Matrix& other) const;
    };

    Matrix left, right, baseline, current;
};
