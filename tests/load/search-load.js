#!/bin/bash
# k6 load test for product search

import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },    // Ramp up
    { duration: '60s', target: 500 },    // Peak load
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],    // p99 latency < 200ms
    http_req_failed: ['rate<0.001'],     // error rate < 0.1%
  },
};

const BASE_URL = 'http://api.localhost:3000';

export default function () {
  group('Search endpoint', () => {
    const response = http.get(
      `${BASE_URL}/api/v1/search?q=laptop&page=1&limit=20`
    );

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has results': (r) => JSON.parse(r.body).items.length > 0,
    });
  });

  sleep(1);

  group('Product detail', () => {
    const response = http.get(`${BASE_URL}/api/v1/catalog/products/prod_001`);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'has product name': (r) => JSON.parse(r.body).name !== undefined,
    });
  });

  sleep(1);
}
