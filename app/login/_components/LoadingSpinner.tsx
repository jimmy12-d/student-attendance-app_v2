import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    return (
        <div className={`
            inline-block 
            ${sizeClasses[size]} 
            animate-spin 
            rounded-full 
            border-4 
            border-solid 
            border-company-purple 
            border-r-transparent 
            align-[-0.125em] 
            motion-reduce:animate-[spin_1.5s_linear_infinite]
            ${className}
        `}
        role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
            </span>
        </div>
    );
};

export default LoadingSpinner; 