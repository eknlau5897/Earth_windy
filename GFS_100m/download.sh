GFS_DATE="20260407"
GFS_TIME="18"
RES="0p25"
BBOX="leftlon=0&rightlon=360&toplat=90&bottomlat=-90"
LEVEL="lev_100_m_above_ground=on"
DIR="/Users/eknlau/VS code/Earth_windy"

# 1. Start the loop (0 to 120 in steps of 6)
for i in $(seq 0 6 120)
do
    # 2. Format the hour to be 3 digits (0 -> 000, 6 -> 006, etc.)
    FHOUR=$(printf "%03d" $i)
    
    echo "--- Processing Forecast Hour: ${FHOUR} ---"

    # 3. Dynamic URL (Changed .f120 to .f${FHOUR})
    GFS_URL="https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_${RES}.pl?file=gfs.t${GFS_TIME}z.pgrb2.${RES}.f${FHOUR}&${LEVEL}&${BBOX}&dir=%2Fgfs.${GFS_DATE}%2F${GFS_TIME}%2Fatmos"

    # 4. Download
    curl "${GFS_URL}&var_UGRD=on" -o utmp.grib
    curl "${GFS_URL}&var_VGRD=on" -o vtmp.grib

    # 5. Process
    grib_set -r -s packingType=grid_simple utmp.grib utmp.grib
    grib_set -r -s packingType=grid_simple vtmp.grib vtmp.grib

    # 6. Convert to JSON
    printf "{\"u\":`grib_dump -j utmp.grib`,\"v\":`grib_dump -j vtmp.grib`}" > tmp.json

    # 7. Run Node script (Using your specific directory structure)
    node ${DIR}/prepare.js ${DIR}/GFS_100m/wind/${GFS_DATE}${GFS_TIME}_${FHOUR}

    # 8. Cleanup for next loop
    rm utmp.grib vtmp.grib tmp.json
done
