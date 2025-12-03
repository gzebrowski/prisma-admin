import React from 'react';
import {
    Pagination,
    PaginationPrevious,
    PaginationNext,
    PaginationItem,
    PaginationLink,
    PaginationContent,
    PaginationEllipsis
} from './ui';

type PaginatorProps = {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    maxVisiblePages?: number;
    onPageChange: (page: number) => void;
    className?: string;
};

const Paginator: React.FC<PaginatorProps> = ({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    maxVisiblePages = 5,
    className = ''
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        return null; // No pagination needed
    }
    return (
        <Pagination className={className}>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
                        isActive={currentPage !== 0}
                    >
                    </PaginationPrevious>
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => {
                    if (index < currentPage - Math.floor(maxVisiblePages / 2) || index > currentPage + Math.floor(maxVisiblePages / 2)) {
                        return null;
                    }
                    return (
                        <PaginationItem key={index}>
                            <PaginationLink
                                isActive={index === currentPage}
                                onClick={() => onPageChange(index)}
                            >
                                {index + 1}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                {totalPages > maxVisiblePages && (
                    <PaginationEllipsis />
                )}

                <PaginationItem>
                    <PaginationNext
                        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
                        isActive={currentPage < totalPages - 1}
                    >
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};
export default Paginator;
