'use client'

import { FaAws } from "react-icons/fa"
import { SiTerraform } from "react-icons/si"
import { FaGithub } from "react-icons/fa"

export default function TechStackSection() {
  return (
    <section className="py-6">
      <div className="text-center">
        <h2 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">
          Built with <span className="text-red-500">❤</span> for cloud-native backend engineering
        </h2>

        <div className="flex justify-center items-center gap-6 text-gray-700 dark:text-gray-300">
          <FaAws className="text-3xl sm:text-4xl text-yellow-500" />
          <SiTerraform className="text-3xl sm:text-4xl text-purple-600" />
        </div>


        <a
          href="https://github.com/raghavsikaria/dead_mans_switch"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
        >
          <FaGithub className="mr-2 text-xl" />
          View on GitHub
        </a>
      </div>
    </section>
  )
}
