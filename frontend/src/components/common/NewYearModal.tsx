'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

const NEW_YEAR_STORAGE_KEY = 'newYearModalShown';

export const NewYearModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = January, 11 = December
    const currentDay = today.getDate();

    // Determine which "New Year celebration year" we're in
    // Dec 31 belongs to the upcoming year's celebration
    // Jan 1 onwards belongs to the current year's celebration
    let celebrationYear: number;
    if (currentMonth === 11 && currentDay === 31) {
      // December 31st - celebrate the upcoming year
      celebrationYear = currentYear + 1;
    } else {
      // Any other day - we're in the current year's celebration period
      celebrationYear = currentYear;
    }

    // Check if already shown for this celebration year
    const shownYear = localStorage.getItem(NEW_YEAR_STORAGE_KEY);

    // Show modal if:
    // 1. It's December 31st (for next year), OR
    // 2. It's January (for current year) and user hasn't seen it yet
    const isDecember31 = currentMonth === 11 && currentDay === 31;
    const isJanuary = currentMonth === 0;

    if ((isDecember31 || isJanuary) && shownYear !== celebrationYear.toString()) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Save the celebration year (not calendar year)
    let celebrationYear: number;
    if (currentMonth === 11 && currentDay === 31) {
      celebrationYear = currentYear + 1;
    } else {
      celebrationYear = currentYear;
    }

    localStorage.setItem(NEW_YEAR_STORAGE_KEY, celebrationYear.toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="md">
      <div className="text-center py-6">
        {/* Celebration Icon */}
        <div className="text-6xl mb-6">
          🎉🥳🎊
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">DB</span>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Happy New Year!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
          From all of us at <span className="font-semibold text-primary-600 dark:text-primary-400">Dar Blockchain</span>
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Wishing you a wonderful year ahead filled with success, innovation, and great achievements!
        </p>

        {/* Decorative Elements */}
        <div className="text-4xl mb-6">
          ✨🚀💫
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
        >
          Let's make it great!
        </button>
      </div>
    </Modal>
  );
};
