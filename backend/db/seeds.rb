require 'json'
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