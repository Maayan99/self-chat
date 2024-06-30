function getISTDate(): Date {
    const date = new Date()
    // Add three hours to the time to get to Israel Time
    date.setTime(date.getTime() + 3 * 60 * 60 * 1000)
    return date
}

export { getISTDate }