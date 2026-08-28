#include "merge_sort_workload.hpp"

#include <algorithm>
#include <random>
#include <omp.h>

MergeSortWorkload::MergeSortWorkload(int element_count) : input(element_count) {
    std::mt19937 generator(42);
    std::uniform_int_distribution<int> distribution(0, element_count * 10);
    for (int& value : input) value = distribution(generator);
}

WorkloadDescription MergeSortWorkload::description() const {
    return {"Merge sort", "task-based divide and conquer", {
        {"elements", std::to_string(input.size())}}};
}

bool MergeSortWorkload::run(int threads) {
    current = input;
    std::vector<int> temporary(current.size());
    #pragma omp parallel num_threads(threads)
    {
        #pragma omp single
        merge_sort_tasks(current, temporary, 0, current.size());
    }
    if (threads == 1) baseline = current;
    return true;
}

bool MergeSortWorkload::verify() const { return current == baseline; }

void MergeSortWorkload::merge(std::vector<int>& values, std::vector<int>& temporary,
                              std::size_t first, std::size_t middle, std::size_t last) {
    std::size_t left = first, right = middle, output = first;
    while (left < middle && right < last)
        temporary[output++] = values[left] <= values[right] ? values[left++] : values[right++];
    while (left < middle) temporary[output++] = values[left++];
    while (right < last) temporary[output++] = values[right++];
    std::copy(temporary.begin() + first, temporary.begin() + last, values.begin() + first);
}

void MergeSortWorkload::merge_sort_tasks(std::vector<int>& values,
                                         std::vector<int>& temporary,
                                         std::size_t first, std::size_t last) {
    if (last - first <= 1) return;
    const std::size_t middle = first + (last - first) / 2;
    if (last - first > task_cutoff) {
        #pragma omp task shared(values, temporary) firstprivate(first, middle)
        merge_sort_tasks(values, temporary, first, middle);
        #pragma omp task shared(values, temporary) firstprivate(middle, last)
        merge_sort_tasks(values, temporary, middle, last);
        #pragma omp taskwait
    } else {
        merge_sort_tasks(values, temporary, first, middle);
        merge_sort_tasks(values, temporary, middle, last);
    }
    merge(values, temporary, first, middle, last);
}
