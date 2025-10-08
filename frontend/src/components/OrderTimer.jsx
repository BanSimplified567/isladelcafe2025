import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Function to check if order has exceeded 15 minutes
export const hasOrderExceededTimeout = (createdAt) => {
  const orderTime = new Date(createdAt);
  const currentTime = new Date();
  const minutesDiff = (currentTime - orderTime) / (1000 * 60);
  return minutesDiff >= 15;
};

// Function to check if order is approaching 10-15 minute mark
export const isOrderApproachingTimeout = (createdAt) => {
  const orderTime = new Date(createdAt);
  const currentTime = new Date();
  const minutesDiff = (currentTime - orderTime) / (1000 * 60);
  return minutesDiff >= 10 && minutesDiff < 15;
};

// Function to get remaining time or timeout message
export const getTimeRemaining = (createdAt) => {
  const orderTime = new Date(createdAt);
  const currentTime = new Date();
  const minutesDiff = (currentTime - orderTime) / (1000 * 60);

  if (minutesDiff >= 15) {
    return '15 mins exceeded. Confirm order';
  }

  const remainingMinutes = Math.max(0, 15 - Math.floor(minutesDiff));
  return `${remainingMinutes} min remaining`;
};

export const OrderTimer = ({ createdAt, orderStatus }) => {
  const [timeStatus, setTimeStatus] = useState('');

  // Update timer every second
  useEffect(() => {
    if (!createdAt || orderStatus !== 'Pending') return;

    const updateTimer = () => {
      setTimeStatus(getTimeRemaining(createdAt));
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt, orderStatus]);

  if (!createdAt || orderStatus !== 'Pending') {
    return null;
  }

  // Decide styling based on timeout status
  let bgColor = 'bg-green-100 p-2 text-green-800';
  if (isOrderApproachingTimeout(createdAt)) {
    bgColor = 'bg-orange-100 p-2  text-orange-800';
  } else if (hasOrderExceededTimeout(createdAt)) {
    bgColor = 'bg-red-100 p-2  text-red-800';
  }

  return (
    <div
      className={ `order-status-color ${bgColor}` }
    >
      { timeStatus }
    </div>
  );
};

OrderTimer.propTypes = {
  createdAt: PropTypes.string.isRequired,
  orderStatus: PropTypes.string.isRequired,
};
