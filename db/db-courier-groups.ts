import {query} from "./db";
import {DbGroup} from "../group-bot/group-bot-client";


async function getAllCourierGroups() {
    const response = await query('SELECT * FROM courier_groups');

    return response.rows;
}

async function addCourierGroup(group: DbGroup) {
    const response = await query('INSERT INTO courier_groups (serialized_id, tags) VALUES ($1, $2) ON CONFLICT (serialized_id) DO NOTHING;', [group.serialized_id, group.tags]) ;
    return response.rows[0];
}

async function setTagsOfCourierGroup(group: DbGroup) {
    const response = await query('UPDATE courier_groups SET tags = $1 WHERE serialized_id = $2 RETURNING *;', [group.tags, group.serialized_id]) ;
    return response.rows[0];
}

async function extendTagsOfCourierGroup(group: DbGroup) {
    const response = await query('UPDATE courier_groups SET tags = array_cat(tags, $1) WHERE serialized_id = $2 RETURNING *;', [group.tags, group.serialized_id]) ;
    return response.rows[0];
}

async function removeCourierGroup(serializedId: string) {
    const response = await query('DELETE FROM courier_groups WHERE serialized_id = $1', [serializedId]) ;
    return response.rows[0];
}


export { setTagsOfCourierGroup, extendTagsOfCourierGroup, removeCourierGroup, getAllCourierGroups, addCourierGroup}