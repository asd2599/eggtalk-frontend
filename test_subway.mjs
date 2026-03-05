import axios from 'axios';
import { SUBWAY_STATION_COORDS } from './src/features/MS/subwayCoords.js';

const KEY = '4f64766647796f7536377341644e65';

async function test() {
  const lineName = '2호선';
  const url = `http://swopenapi.seoul.go.kr/api/subway/${KEY}/json/realtimePosition/0/200/${encodeURIComponent(lineName)}`;

  try {
    const res = await axios.get(url);
    const data = res.data;
    if (data.realtimePositionList) {
      console.log(
        `Fetched ${data.realtimePositionList.length} trains for ${lineName}`,
      );

      let mappedCount = 0;
      data.realtimePositionList.forEach((item, i) => {
        let rawStationName = item.statnNm.trim();
        let stationName = rawStationName.split('(')[0].trim();
        stationName = stationName
          .replace('종착', '')
          .replace('출발', '')
          .replace('지선', '')
          .trim();

        let coords =
          SUBWAY_STATION_COORDS[lineName]?.[stationName] ||
          SUBWAY_STATION_COORDS[lineName]?.[stationName + '역'];
        let noSpaceName = stationName.replace(/\s+/g, '');
        if (!coords) {
          coords =
            SUBWAY_STATION_COORDS[lineName]?.[noSpaceName] ||
            SUBWAY_STATION_COORDS[lineName]?.[noSpaceName + '역'];
        }

        if (coords) {
          mappedCount++;
        } else {
          console.log(
            `Unmapped station -> Raw: ${rawStationName}, Parsed: ${stationName}`,
          );
        }

        if (i < 3) {
          console.log(
            `[${i}] Raw: ${rawStationName}, Parsed: ${stationName}, Mapped: ${!!coords}, Status: ${item.trainSttus}, Updn: ${item.updnLine}`,
          );
        }
      });
      console.log(
        `Mapped ${mappedCount} out of ${data.realtimePositionList.length}`,
      );
    } else {
      console.log('Error/No data:', data);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
