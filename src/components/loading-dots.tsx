
'use client';

interface LoadingDotsProps {
    text?: string;
}

const LoadingDots = ({ text = "Loading" }: LoadingDotsProps) => {
    return (
        <div className="flex items-center justify-center space-x-2">
            <span className="text-sm font-medium text-foreground">{text}</span>
            <div className="loading-dots flex space-x-1">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span className="w-2 h-2 bg-primary rounded-full"></span>
            </div>
        </div>
    );
};

export default LoadingDots;
