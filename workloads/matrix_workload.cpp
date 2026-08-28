#include "matrix_workload.hpp"

#include <random>
#include <utility>
#include <omp.h>

void MatrixWorkload::Matrix::matrix_builder(int rows, int cols) {
    r = rows;
    c = cols;
    mat.assign(r, std::vector<int>(c));
    static std::random_device device;
    static std::mt19937 generator(device());
    std::uniform_int_distribution<int> distribution(1, 1000);
    for (auto& row : mat)
        for (int& value : row) value = distribution(generator);
}

bool MatrixWorkload::Matrix::multiply(const Matrix& other, Matrix& result, int threads) const {
    if (c != other.r) return false;
    result.r = r;
    result.c = other.c;
    result.mat.assign(result.r, std::vector<int>(result.c, 0));
    #pragma omp parallel for num_threads(threads) schedule(static)
    for (int i = 0; i < r; ++i)
        for (int j = 0; j < other.c; ++j) {
            int sum = 0;
            for (int k = 0; k < c; ++k) sum += mat[i][k] * other.mat[k][j];
            result.mat[i][j] = sum;
        }
    return true;
}

bool MatrixWorkload::Matrix::equals(const Matrix& other) const {
    if (r != other.r || c != other.c) return false;
    for (int i = 0; i < r; ++i)
        for (int j = 0; j < c; ++j)
            if (mat[i][j] != other.mat[i][j]) return false;
    return true;
}

MatrixWorkload::MatrixWorkload(int rows, int inner, int columns) {
    left.matrix_builder(rows, inner);
    right.matrix_builder(inner, columns);
}

WorkloadDescription MatrixWorkload::description() const {
    return {"Matrix multiplication", "compute", {
        {"rows", std::to_string(left.r)},
        {"inner", std::to_string(left.c)},
        {"columns", std::to_string(right.c)}}};
}

bool MatrixWorkload::run(int threads) {
    Matrix result;
    if (!left.multiply(right, result, threads)) return false;
    if (threads == 1) baseline = std::move(result);
    else current = std::move(result);
    return true;
}

bool MatrixWorkload::verify() const { return current.equals(baseline); }
