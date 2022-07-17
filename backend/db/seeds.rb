require 'json'
require "net/http"

if Square.count === 0 then
  puts "going to seed sqlite database with square data"

  squares_data = JSON.load(File.new("db/square_seed_data.json"))
  squares_data["values"].each do |square|
    Square.create({
      idx: square[1],
      x: square[3],
      y: square[4],
      url: "",
      img: "ipfs://QmegSPCaeSnrnV4R7c4FNFyartRpCzWtm97ETPohmhK9zB",
      msg: "",
      traits: square[5],
      the_type: square[7]
    })
    puts "created square #{square[1]}"
  end

  puts "completed seeding the database"

  sleep(1)
end

if Square.count === 10000 then
  puts "mirroring existing state on cardanospace.com to sqlite database"

  uri = URI("https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/latest_squares.json")

  latest_square_data = JSON.parse Net::HTTP.get(uri)

  latest_square_data.each do |square_data|
    puts "updating #{square_data["idx"]}"
    square = Square.find_by_idx(square_data["idx"])
    square.url = square_data["url"]
    square.img = square_data["img"]
    square.msg = square_data["msg"]
    square.audio = square_data["audio"]
    square.tdrs = square_data["tdrs"]
    square.save
  end

  puts "completed updating all squares with latest data"
end

puts "done running seeds"