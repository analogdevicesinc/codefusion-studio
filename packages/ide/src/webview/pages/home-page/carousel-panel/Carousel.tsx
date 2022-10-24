/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// Import Swiper React components
import React from "react";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { ResourceCard } from "./ResourceCard";
import { default as Resources } from "./resources.json";

import "./carousel.scss";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export const Carousel = () => {
  return (
    <div>
      <Swiper
        slidesPerView={"auto"}
        spaceBetween={16}
        navigation={{
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        }}
        pagination={{
          el: ".pagination",
          clickable: true,
        }}
        modules={[Navigation, Pagination]}
        className="carousel"
      >
        {Resources.map((resource) => (
          <SwiperSlide key={resource.title}>
            <ResourceCard
              link={resource.link}
              img={resource.img}
              title={resource.title}
              description={resource.description}
            />
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="swiper-nav-buttons">
        <div className="swiper-button-prev" />
        <div className="pagination" />
        <div className="swiper-button-next" />
      </div>
    </div>
  );
};
